"""Accepttestene i SPEC-postmortem-ip-graense.md: højst 10 analyser pr. IP pr. 10 minutter på tværs af instanser.

Tælleren står i Table Storage (Azurite i testene) med en HMAC af IP'en, én række pr. hash og 10-minutters vindue, og
optimistisk samtidighed med ETag. Holdlisten tæller ikke. Fejler lageret, går analysen igennem, og fejlen logges uden IP.
"""
import json
import logging
import pathlib
import re
import threading

import azure.functions as func
import pytest
from azure.core.exceptions import ServiceRequestError
from azure.data.tables import TableClient

from conftest import API, HOLD_URL, PAR_URL
from postmortem import graense

NOEGLE = b'testnoegle-ikke-hemmelig'
IP = '203.0.113.7'
FOR_MANGE = 'For mange analyser lige nu. Prøv igen om lidt.'
# Et tidspunkt midt i et vindue: 13. november 2026 kl. 06:03:20 UTC (vinduet 06:00–06:10).
T0 = 1794549800.0


def klient(forbindelse, navn, **kw):
    return TableClient.from_connection_string(forbindelse, table_name=navn, **kw)


def instans(ny_tabel, nu, noegle=NOEGLE):
    """En "instans": sin egen forbindelse til samme tabel og sit eget ur."""
    forbindelse, navn = ny_tabel
    return graense.IpGraense(klient(forbindelse, navn), noegle, ur=lambda: nu[0])


# 1. To instanser mod samme lager

def test_to_instanser_giver_tilsammen_429_ved_den_11_analyse(ny_tabel):
    nu = [T0]
    a, b = instans(ny_tabel, nu), instans(ny_tabel, nu)
    for i in range(10):
        assert (a if i % 2 else b).tillad(IP) is None, i
        nu[0] += 20
    vent = a.tillad(IP)
    assert vent is not None and 1 <= vent <= 600
    assert b.tillad(IP) is not None
    # En anden IP har sin egen tæller
    assert a.tillad('198.51.100.2') is None


def test_samtidige_kald_fra_to_instanser_taelles_hver_for_sig(ny_tabel):
    # Optimistisk samtidighed: 20 kald på samme tid fra to instanser giver præcis 10 igennem.
    nu = [T0]
    a, b = instans(ny_tabel, nu), instans(ny_tabel, nu)
    svar = []
    lås = threading.Lock()

    def kald(g):
        r = g.tillad(IP)
        with lås:
            svar.append(r)

    traade = [threading.Thread(target=kald, args=(a if i % 2 else b,)) for i in range(20)]
    for t in traade:
        t.start()
    for t in traade:
        t.join()
    assert sum(1 for r in svar if r is None) == 10
    assert sum(1 for r in svar if r is not None) == 10


def test_et_nyt_vindue_giver_plads_igen(ny_tabel):
    nu = [T0]
    a = instans(ny_tabel, nu)
    for _ in range(10):
        a.tillad(IP)
    assert a.tillad(IP) is not None
    nu[0] += 600
    assert a.tillad(IP) is None


def test_vinduerne_foelger_uret_i_10_minutter():
    assert graense.vindue_noegle(T0) == '202611130600'
    assert graense.vindue_noegle(T0 + 399) == '202611130600'
    assert graense.vindue_noegle(T0 + 400) == '202611130610'


def test_raekken_har_en_hmac_af_ip_en_og_ikke_ip_en(ny_tabel):
    forbindelse, navn = ny_tabel
    nu = [T0]
    instans(ny_tabel, nu).tillad(IP)
    raekker = list(klient(forbindelse, navn).list_entities())
    assert len(raekker) == 1
    r = raekker[0]
    assert r['PartitionKey'] == '202611130600'
    assert re.fullmatch(r'[0-9a-f]{64}', r['RowKey'])
    assert r['RowKey'] == graense.hash_ip(NOEGLE, IP) != graense.hash_ip(b'en-anden-noegle', IP)
    assert IP not in json.dumps({k: str(v) for k, v in r.items()})


# 2. Slettejobbet

def test_slettejobbet_fjerner_gamle_vinduer_og_lader_de_nye_staa(ny_tabel):
    forbindelse, navn = ny_tabel
    nu = [T0]
    g = instans(ny_tabel, nu)
    # Vinduerne 05:20, 05:40, 05:50, 06:00 og 06:10
    for minutter in (-40, -20, -10, 0, 10):
        nu[0] = T0 + minutter * 60
        g.tillad(IP)
    # Kl. 06:15:20 er vinduet 06:00 over 15 minutter gammelt og slettes; 06:10 bliver stående.
    nu[0] = T0 + 12 * 60
    assert g.slet_gamle() == 4
    tilbage = [r['PartitionKey'] for r in klient(forbindelse, navn).list_entities()]
    assert tilbage == ['202611130610']
    # Jobbet kører hvert 5. minut og sletter vinduer, der er mindst 15 minutter gamle, så ingen hash står over 20 minutter.
    assert graense.SLET_EFTER + 5 * 60 <= 20 * 60


def test_slettejobbet_er_en_timer_hvert_5_minut():
    import function_app
    funktioner = {f.get_function_name(): f for f in function_app.app.get_functions()}
    assert 'slet_ip_vinduer' in funktioner
    trigger = funktioner['slet_ip_vinduer'].get_trigger()
    assert trigger.get_binding_name() == 'timerTrigger'
    assert trigger.schedule == '0 */5 * * * *'


# 3. Funktionen: holdlisten, 429, et lager der fejler, og ingen IP i loggen

@pytest.fixture
def app(monkeypatch):
    import function_app
    kaldt = []

    def falsk_analyse(krop, hent=None, cache=None):
        kaldt.append(krop)
        if 'hold' not in krop and 'multihold' in krop['url']:
            return 200, {'turnering': {'form': 'hold'}, 'vaelg': {'hold': []}}
        return 200, {'turnering': {'form': 'par'}, 'spil': []}

    monkeypatch.setattr(function_app, 'analyser', falsk_analyse)
    monkeypatch.setattr(function_app, '_cache', object())
    function_app.kaldt = kaldt
    return function_app


def kald(app, krop, ip=IP + ':51234', header='X-Forwarded-For'):
    headers = {'Content-Type': 'application/json'}
    if ip:
        headers[header] = ip
    req = func.HttpRequest(method='POST', url='/api/analyse', headers=headers, body=json.dumps(krop).encode('utf-8'))
    svar = app.analyse.build().get_user_function()(req)
    return svar.status_code, json.loads(svar.get_body().decode('utf-8')), svar.headers


def test_funktionen_svarer_429_ved_den_11_analyse_og_holdlisten_taeller_ikke(app, ny_tabel, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    nu = [T0]
    instanser = [instans(ny_tabel, nu), instans(ny_tabel, nu)]
    for i in range(25):
        monkeypatch.setattr(app, 'GRAENSE', instanser[i % 2])
        assert kald(app, {'url': HOLD_URL})[0] == 200
    for i in range(10):
        monkeypatch.setattr(app, 'GRAENSE', instanser[i % 2])
        assert kald(app, {'url': PAR_URL})[0] == 200, i
    status, svar, headers = kald(app, {'url': HOLD_URL, 'hold': '2-NS'})
    assert status == 429 and svar == {'fejl': FOR_MANGE}
    assert 1 <= int(headers['Retry-After']) <= 600
    assert kald(app, {'url': HOLD_URL})[0] == 200
    # Samme IP med en anden port og bag en proxy er samme bruger; IPv6 og X-Client-IP virker også.
    assert kald(app, {'url': PAR_URL}, ip=IP + ':60000')[0] == 429
    assert kald(app, {'url': PAR_URL}, ip=IP + ', 10.0.0.1')[0] == 429
    assert kald(app, {'url': PAR_URL}, ip=IP, header='X-Client-IP')[0] == 429
    assert kald(app, {'url': PAR_URL}, ip='[2001:db8::1]:443')[0] == 200
    # Hverken IP'en eller dens hash står i loggen (heller ikke i Azure SDK'ens log over adresser).
    assert IP not in caplog.text
    assert graense.hash_ip(NOEGLE, IP) not in caplog.text
    assert 'postmortem: 429 graense' in caplog.text


class FejlendeTabel:
    def __getattr__(self, navn):
        def fejl(*a, **kw):
            raise ServiceRequestError('lageret svarer ikke')
        return fejl


def test_et_lager_der_fejler_giver_200_og_fejlen_logges_uden_ip(app, monkeypatch, caplog):
    caplog.set_level(logging.DEBUG)
    monkeypatch.setattr(app, 'GRAENSE', graense.IpGraense(FejlendeTabel(), NOEGLE))
    for _ in range(12):
        assert kald(app, {'url': PAR_URL})[0] == 200
    assert 'postmortem: graense-lageret fejlede (ServiceRequestError)' in caplog.text
    assert IP not in caplog.text and graense.hash_ip(NOEGLE, IP) not in caplog.text


def test_et_lager_der_ikke_svarer_giver_200(app, monkeypatch, caplog):
    # En rigtig klient mod en port, hvor intet svarer, uden genforsøg
    from conftest import AZURITE_KONTO, _ledig_port
    tabel = TableClient.from_connection_string(AZURITE_KONTO.format(port=_ledig_port()), table_name='ipgraense',
                                               retry_total=0, connection_timeout=2)
    monkeypatch.setattr(app, 'GRAENSE', graense.IpGraense(tabel, NOEGLE))
    caplog.set_level(logging.INFO)
    assert kald(app, {'url': PAR_URL})[0] == 200
    assert 'postmortem: graense-lageret fejlede' in caplog.text


def test_uden_noegle_eller_lager_gaar_analysen_igennem_og_det_logges(app, monkeypatch, caplog):
    caplog.set_level(logging.INFO)
    monkeypatch.delenv('IP_HASH_KEY', raising=False)
    monkeypatch.setattr(app, 'GRAENSE', None)
    monkeypatch.setattr(app, '_graense_hentet', False)
    for _ in range(12):
        assert kald(app, {'url': PAR_URL})[0] == 200
    assert 'postmortem: graensen er slået fra (IP_HASH_KEY eller lageret mangler)' in caplog.text


def test_uden_ip_ingen_graense_og_intet_lager(app, monkeypatch):
    monkeypatch.setattr(app, 'GRAENSE', graense.IpGraense(FejlendeTabel(), NOEGLE))
    for _ in range(15):
        assert kald(app, {'url': PAR_URL}, ip=None)[0] == 200


def test_taelleren_i_hukommelsen_er_fjernet():
    import function_app
    kilde = (API / 'function_app.py').read_text(encoding='utf-8')
    assert not hasattr(function_app, 'Graense')
    assert 'self._ip' not in kilde and 'time.monotonic' not in kilde


def test_noeglen_staar_kun_i_azure():
    # IP_HASH_KEY læses fra miljøet; ingen fil i repoet har en værdi for den.
    rod = API.parent
    for sti in rod.rglob('*'):
        if any(d in sti.parts for d in ('.git', 'node_modules', '.venv', '__pycache__', 'dist', '.pytest_cache')):
            continue
        if sti.is_file() and sti.suffix in {'.py', '.json', '.md', '.yml', '.ts', '.tsx', '.txt'}:
            tekst = sti.read_text(encoding='utf-8', errors='replace')
            assert not re.search(r'IP_HASH_KEY["\']?\s*[:=]\s*["\']?[0-9a-fA-F]{16,}', tekst), sti
    assert 'local.settings.json' in (rod / '.gitignore').read_text(encoding='utf-8')
