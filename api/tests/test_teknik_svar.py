"""Accepttest 6, 7 og 9 i SPEC-postmortem-1b-maerker.md og ydeevnekravet, skrevet før løseren: de nye felter i svaret.

6. Udspil: prisen stemmer med ddEfter og ddFoer fra vindue 1a på de 48 spil (samme forskel i stik).
7. Uændret: faktorerne i de to testsvar (src/test/data/) er de samme som før.
9. Svaret har de nye felter, uden navne (felterne tjekkes mod SVAR.md i test_svar.py).
Ydeevne: en aften med 32 spil uden cache på under 60 sekunder, og intet spil over 10 sekunder.
"""
import json
import time

import pytest

from conftest import API, HOLD_URL, PAR_URL, GemteSider
from postmortem import teknik
from postmortem.analyse import analyser
from postmortem.cache import HukommelsesCache
from postmortem.regn import dd_efter_udspil

FAKTORER = ('meldinger', 'spilfoering', 'modspil', 'held')
TESTSVAR = API.parent / 'src' / 'test' / 'data'
AFTENER = [('par-452', {'url': PAR_URL}), ('hold-450', {'url': HOLD_URL, 'hold': '2-NS'})]


@pytest.fixture(scope='module')
def aftener():
    return {navn: analyser(krop, hent=GemteSider())[1] for navn, krop in AFTENER}


def pbn(spil):
    return 'N:' + ' '.join(spil['haender'][p] for p in 'NESW')


def test_6_udspillets_pris_er_forskellen_mellem_dd_efter_og_dd_foer(aftener):
    antal = 0
    for svar in aftener.values():
        for spil in svar['spil']:
            u = spil['raad']['udspil']
            assert u['bedste'] and all(gruppe for gruppe in u['bedste'])
            if spil['ddEfter'] is None:
                assert u['faktisk'] is None and u['pris'] is None
                assert spil['teknik']['udspilAntaget'] is True
            else:
                assert u['faktisk'] == spil['udspil']
                assert u['pris'] == spil['ddEfter'] - spil['ddFoer'] >= 0
                assert spil['teknik']['udspilAntaget'] is False
                # Det faktiske udspil er blandt de bedste, netop når det ikke koster noget.
                assert (spil['udspil'] in [k for g in u['bedste'] for k in g]) == (u['pris'] == 0)
            antal += 1
    assert antal == 48


def test_6_de_bedste_udspil_holder_spilfoerer_paa_dd_foer(aftener):
    for spil in aftener['hold-450']['spil']:
        farve = spil['kontrakt'][1:].rstrip('X')
        for gruppe in spil['raad']['udspil']['bedste']:
            for kort in gruppe:
                assert dd_efter_udspil(pbn(spil), spil['spilfoerer'], farve, kort) == spil['ddFoer'], (spil['nummer'], kort)


@pytest.mark.parametrize('navn', ['par-452', 'hold-450'])
def test_7_faktorerne_er_de_samme_som_i_testsvarene_fra_1c(aftener, navn):
    foer = json.loads((TESTSVAR / f'{navn}.json').read_text(encoding='utf-8'))
    nu = aftener[navn]
    assert nu['faktorer'] == foer['faktorer']
    assert nu['resultat'] == foer['resultat'] and nu['stoersteForbedring'] == foer['stoersteForbedring']
    assert len(nu['spil']) == len(foer['spil'])
    nye = {'maerker', 'teknik', 'raad', 'linje'}
    for a, b in zip(nu['spil'], foer['spil']):
        assert a['faktorer'] == b['faktorer'], a['nummer']
        # Alt andet end de nye felter er også som før.
        assert {k: v for k, v in a.items() if k not in nye} == {k: v for k, v in b.items() if k not in nye}, a['nummer']
    assert {k: v for k, v in nu.items() if k not in ('spil', 'teknikker')} == \
           {k: v for k, v in foer.items() if k not in ('spil', 'teknikker')}


@pytest.mark.parametrize('navn', ['par-452', 'hold-450'])
def test_7_appens_testsvar_er_funktionens_svar(aftener, navn):
    # Del B: testsvarene i src/test/data/ er lavet igen med de nye felter og skal følge funktionen (README viser hvordan).
    assert aftener[navn] == json.loads((TESTSVAR / f'{navn}.json').read_text(encoding='utf-8'))


def test_9_maerkerne_og_teknikken_haenger_sammen(aftener):
    for svar in aftener.values():
        for spil in svar['spil']:
            t = spil['teknik']
            assert t['beregnet'] is True and t['grund'] is None and t['stikFoerP'] == 7
            assert spil['maerker'] == [m for m in ('skvis', 'indspil') if t[m] is not None]
            assert len(spil['linje']) == 13
            med = spil['ddEfter'] if spil['ddEfter'] is not None else spil['ddFoer']
            for m in spil['maerker']:
                assert t[m]['medTeknik'] == med > t[m]['udenTeknik']
                assert t[m]['mod'] in ('begge', 'en af dem') or t[m]['mod'] in 'NESW'
                if t[m]['mod'] in 'NESW':   # modspilleren sidder ikke på spilførers side
                    assert (t[m]['mod'] in 'NS') != (spil['spilfoerer'] in 'NS')
                assert t[m]['stik'] is None or 7 <= t[m]['stik'] <= 13
            assert t['kastIndSkvis'] in (True, False)
            for side in ('spilfoering', 'modspil'):
                assert len(spil['raad'][side]) <= 3


def test_9_et_spil_der_ikke_er_spillet_har_ingen_teknik(gemte_sider):
    status, svar = analyser({'url': HOLD_URL, 'hold': '4-NS'}, hent=gemte_sider)
    assert status == 200
    for spil in svar['spil']:
        assert spil['maerker'] == [] and spil['raad'] is None and spil['linje'] is None
        assert spil['teknik']['beregnet'] is False and spil['teknik']['grund'] == 'ikke spillet'
    assert svar['teknikker']['skvis']['spil'] == 0 and svar['teknikker']['spilfoerer']['spil'] == 0


def test_9_aftenens_teknikker_taeller_spillene(aftener):
    for svar in aftener.values():
        spillede = [s for s in svar['spil'] if s['spillet']]
        som_spilfoerer = [s for s in spillede if s['spilfoerer'] and (s['spilfoerer'] in 'NS') == (s['retning'] == 'NS')]
        t = svar['teknikker']
        assert set(t) == {'skvis', 'indspil', 'spilfoerer'}
        for m in ('skvis', 'indspil'):
            med = [s for s in spillede if m in s['maerker']]
            egne = [s for s in med if s in som_spilfoerer]
            assert t[m] == {'spil': len(med), 'somSpilfoerer': len(egne),
                            'taget': sum(1 for s in egne if s['stik'] >= s['teknik'][m]['medTeknik'])}
        dd = [s['ddEfter'] if s['ddEfter'] is not None else s['ddFoer'] for s in som_spilfoerer]
        assert t['spilfoerer'] == {'spil': len(som_spilfoerer),
                                   'ddStik': sum(1 for s, d in zip(som_spilfoerer, dd) if s['stik'] >= d)}


def test_9_resultaterne_gemmes_i_cachen_uden_navne(monkeypatch):
    cache = HukommelsesCache()
    status, foerste = analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=cache)
    assert status == 200
    gemt = [k for k in cache.data if k.endswith('/teknik')]
    assert len(gemt) == 16
    assert all(k.startswith('450/2/') for k in gemt)
    assert 'Hold' not in json.dumps(cache.data) and 'Spiller' not in json.dumps(cache.data)

    def maa_ikke_kaldes(*a, **kw):
        raise AssertionError('teknikken blev regnet igen')

    monkeypatch.setattr(teknik, 'analyser', maa_ikke_kaldes)
    status, anden = analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=cache)
    assert status == 200 and anden == foerste


def test_9_en_fejl_i_teknikken_vaelter_ikke_analysen(monkeypatch, caplog):
    def fejler(*a, **kw):
        raise RuntimeError('uventet')

    monkeypatch.setattr(teknik, 'analyser', fejler)
    cache = HukommelsesCache()
    status, svar = analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider(), cache=cache)
    assert status == 200 and len(svar['spil']) == 16
    for spil in svar['spil']:
        assert spil['faktorer'] is not None
        assert spil['teknik']['beregnet'] is False and spil['teknik']['grund'] == 'fejl'
        assert spil['maerker'] == [] and spil['raad'] is None and spil['linje'] is None
    assert 'postmortem: teknikken fejlede i spil 1 (RuntimeError)' in caplog.text
    assert not [k for k in cache.data if k.endswith('/teknik')]   # en fejl gemmes ikke


def test_ydeevne_en_aften_med_32_spil_uden_cache_under_60_sekunder():
    teknik.glem()
    start = time.perf_counter()
    status, svar = analyser({'url': PAR_URL}, hent=GemteSider())
    tid = time.perf_counter() - start
    assert status == 200 and len(svar['spil']) == 32
    assert all(s['teknik']['beregnet'] for s in svar['spil'])
    assert tid < 60, f'{tid:.1f} s'
    assert len(teknik.TIDER) >= 32 and max(teknik.TIDER.values()) < 10, max(teknik.TIDER.values())
