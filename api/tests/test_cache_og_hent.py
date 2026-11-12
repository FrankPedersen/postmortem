"""Cachen, hentningen fra bridge.dk og selve Azure-funktionen (trin 5)."""
import json

import azure.functions as func
import pytest

from conftest import HOLD_URL, PAR_URL, GemteSider
from postmortem import analyse, cache, hent, regn


def test_fil_cache_gemmer_og_laeser(tmp_path):
    c = cache.FilCache(tmp_path)
    assert c.get('452/1/3/abc/dd') is None
    c.set('452/1/3/abc/dd', {'dd': {'N': {'NT': 9}}})
    assert cache.FilCache(tmp_path).get('452/1/3/abc/dd') == {'dd': {'N': {'NT': 9}}}


def test_anden_analyse_regner_ikke_dd_igen(tmp_path, monkeypatch):
    c = cache.FilCache(tmp_path)
    status, foerste = analyse.analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=c)
    assert status == 200

    def maa_ikke_kaldes(*args, **kwargs):
        raise AssertionError('DDS kaldt, selv om svaret ligger i cachen')
    monkeypatch.setattr(regn, 'dd_og_par', maa_ikke_kaldes)
    monkeypatch.setattr(regn, 'dd_efter_udspil', maa_ikke_kaldes)
    status, anden = analyse.analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=c)
    assert status == 200 and anden == foerste


def test_cachen_har_ingen_navne(tmp_path):
    c = cache.FilCache(tmp_path)
    analyse.analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=c)
    indhold = ' '.join(p.read_text(encoding='utf-8') for p in tmp_path.iterdir())
    # Testsiderne er anonymiserede, så navnene hedder "Spiller n" og "Hold n" (anonymiser.py).
    assert indhold and 'Spiller ' not in indhold and 'Hold ' not in indhold
    c2 = cache.HukommelsesCache()
    analyse.analyser({'url': PAR_URL}, hent=GemteSider(), cache=c2)
    nogler = ' '.join(c2.data)
    assert 'Spiller ' not in nogler and 'Hold ' not in nogler and nogler.startswith('452/1/')


def test_cache_fra_miljoe_uden_lagerkonto(tmp_path, monkeypatch):
    monkeypatch.setenv('AzureWebJobsStorage', '')
    monkeypatch.setenv('POSTMORTEM_CACHE_DIR', str(tmp_path))
    assert isinstance(cache.fra_miljoe(), cache.FilCache)


@pytest.mark.parametrize('url', ['https://example.com/', 'http://resultater.bridge.dk/', 'https://resultater.bridge.dk.example.com/',
                                 'https://bruger@resultater.bridge.dk/', 'ftp://resultater.bridge.dk/'])
def test_hent_afviser_andre_vaerter(url):
    assert not hent.er_bridge_dk(url)
    with pytest.raises(hent.IkkeBridgeDk):
        hent.hent_side(url)


def test_omdirigering_til_anden_vaert_foelges_ikke():
    handler = hent._KunBridgeDk()
    with pytest.raises(hent.IkkeBridgeDk):
        handler.redirect_request(None, None, 302, 'Found', {}, 'https://example.com/side')


def kald(krop, monkeypatch, hent_funktion=None, raa=None):
    import function_app
    monkeypatch.setattr(function_app, 'HENT', hent_funktion or GemteSider())
    monkeypatch.setattr(function_app, '_cache', cache.HukommelsesCache())
    req = func.HttpRequest(method='POST', url='/api/analyse', headers={'Content-Type': 'application/json'},
                           body=raa if raa is not None else json.dumps(krop).encode('utf-8'))
    svar = function_app.analyse.build().get_user_function()(req)
    return svar.status_code, json.loads(svar.get_body().decode('utf-8'))


def test_funktionen_svarer_med_json(monkeypatch):
    status, svar = kald({'url': PAR_URL}, monkeypatch)
    assert status == 200 and len(svar['spil']) == 32 and svar['resultat']['procent'] == pytest.approx(62.28, abs=0.01)
    status, svar = kald({'url': HOLD_URL}, monkeypatch)
    assert status == 200 and len(svar['vaelg']['hold']) == 16


def test_funktionen_afviser_ugyldig_krop(monkeypatch):
    assert kald(None, monkeypatch, raa=b'ikke json') == (400, {'fejl': 'Det er ikke et link fra resultater.bridge.dk'})
    assert kald(None, monkeypatch, raa=b'{"url": "' + b'x' * 5000 + b'"}') == (413, {'fejl': 'Forespørgslen er for stor'})
