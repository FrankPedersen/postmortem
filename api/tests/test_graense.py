"""Accepttest 8 (SPEC-postmortem-1c-app.md): højst 10 analyser pr. IP pr. 10 minutter; holdlisten tæller ikke.

Grænsen ligger i function_app.py før beregningen, så testen erstatter analysen med en hurtig falsk og styrer uret.
"""
import json
import logging

import azure.functions as func
import pytest

from conftest import HOLD_URL, PAR_URL

FOR_MANGE = 'For mange analyser lige nu. Prøv igen om lidt.'


@pytest.fixture
def app(monkeypatch):
    import function_app
    nu = [1000.0]
    kaldt = []

    def falsk_analyse(krop, hent=None, cache=None):
        kaldt.append(krop)
        if 'hold' not in krop and 'multihold' in krop['url']:
            return 200, {'turnering': {'form': 'hold'}, 'vaelg': {'hold': []}}
        return 200, {'turnering': {'form': 'par'}, 'spil': []}

    monkeypatch.setattr(function_app, 'analyser', falsk_analyse)
    monkeypatch.setattr(function_app, '_cache', object())
    monkeypatch.setattr(function_app, 'GRAENSE', function_app.Graense(ur=lambda: nu[0]))
    function_app.kaldt = kaldt
    function_app.nu = nu
    return function_app


def kald(app, krop, ip='203.0.113.7:51234', header='X-Forwarded-For'):
    headers = {'Content-Type': 'application/json'}
    if ip:
        headers[header] = ip
    req = func.HttpRequest(method='POST', url='/api/analyse', headers=headers, body=json.dumps(krop).encode('utf-8'))
    svar = app.analyse.build().get_user_function()(req)
    return svar.status_code, json.loads(svar.get_body().decode('utf-8')), svar.headers


def test_ellevte_analyse_fra_samme_ip_inden_for_10_minutter_giver_429(app):
    for i in range(10):
        status, _, _ = kald(app, {'url': PAR_URL})
        assert status == 200, i
    status, svar, headers = kald(app, {'url': PAR_URL})
    assert status == 429
    assert svar == {'fejl': FOR_MANGE}
    assert 1 <= int(headers['Retry-After']) <= 600
    # Den 11. når ikke frem til beregningen.
    assert len(app.kaldt) == 10


def test_holdvalget_med_hold_taeller_som_en_analyse(app):
    for _ in range(10):
        assert kald(app, {'url': HOLD_URL, 'hold': '2-NS'})[0] == 200
    assert kald(app, {'url': HOLD_URL, 'hold': '2-NS'})[0] == 429


def test_holdlisten_taeller_ikke(app):
    for _ in range(25):
        status, svar, _ = kald(app, {'url': HOLD_URL})
        assert status == 200 and 'vaelg' in svar
    for i in range(10):
        assert kald(app, {'url': PAR_URL})[0] == 200, i
    assert kald(app, {'url': PAR_URL})[0] == 429
    # Holdlisten virker stadig, når grænsen er nået.
    assert kald(app, {'url': HOLD_URL})[0] == 200


def test_andre_ip_er_og_porten_taeller_for_sig(app):
    for _ in range(10):
        kald(app, {'url': PAR_URL}, ip='203.0.113.7:50000')
    # Samme IP med en anden port er samme bruger.
    assert kald(app, {'url': PAR_URL}, ip='203.0.113.7:60000')[0] == 429
    assert kald(app, {'url': PAR_URL}, ip='198.51.100.2:50000')[0] == 200
    assert kald(app, {'url': PAR_URL}, ip='[2001:db8::1]:443')[0] == 200
    assert kald(app, {'url': PAR_URL}, ip='203.0.113.7, 10.0.0.1')[0] == 429
    assert kald(app, {'url': PAR_URL}, ip='203.0.113.7', header='X-Client-IP')[0] == 429


def test_efter_10_minutter_er_der_plads_igen(app):
    for _ in range(10):
        kald(app, {'url': PAR_URL})
    assert kald(app, {'url': PAR_URL})[0] == 429
    app.nu[0] += 599
    assert kald(app, {'url': PAR_URL})[0] == 429
    app.nu[0] += 2
    assert kald(app, {'url': PAR_URL})[0] == 200


def test_uden_ip_ingen_graense(app):
    for _ in range(15):
        assert kald(app, {'url': PAR_URL}, ip=None)[0] == 200


def test_ip_en_logges_ikke(app, caplog):
    caplog.set_level(logging.DEBUG)
    for _ in range(11):
        kald(app, {'url': PAR_URL}, ip='203.0.113.7:51234')
    assert '203.0.113.7' not in caplog.text
    assert '429' in caplog.text


def test_hukommelsen_er_begraenset(app):
    g = app.Graense(maks_ip=100, ur=lambda: app.nu[0])
    for i in range(100):
        assert g.tillad(f'10.0.{i // 256}.{i % 256}') is None
    # Fuld tabel med gyldige poster: en ny IP afvises hellere end at fjerne andres tællere.
    assert g.tillad('192.0.2.1') is not None
    app.nu[0] += 601
    assert g.tillad('192.0.2.1') is None
    assert len(g._ip) == 1
