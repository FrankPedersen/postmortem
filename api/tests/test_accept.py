"""Accepttestene i SPEC-postmortem-1a-funktion.md, skrevet før koden (trin 2)."""
import json
import re
import time
import urllib.error

import pytest

from conftest import DATA, HOLD_URL, PAR_URL, SCORESHEET_URL, GemteSider, side
from postmortem.analyse import analyser
from postmortem.regn import dd_foer_og_efter

FAKTORER = ('meldinger', 'spilfoering', 'modspil', 'held')

# Scoresheet for hold 5 mod hold 7 (scoresheet-450.html): imp for hold 5 pr. spil, i alt 32-47.
# Hold 5 er holdet, der sad NS ved bord 2 og ØV ved bord 6.
IMP_HOLD_5 = [-1, 0, 5, -13, 1, -6, 1, -5, -7, 7, 0, -7, 13, 5, -5, -3]

# Personligt regnskab for par 1 (personligt-regnskab-452.html): point pr. spil på sidens skala (top 14).
# Rundernes point er 30, 50, 29, 25, 47, 29, 29 og 40, i alt 279 af 32 * 14 = 448, altså 62,28 %.
POINT_PAR_1 = [9, 2, 6, 13, 14, 12, 11, 13, 10, 13, 0, 6, 5, 3, 3, 14,
               12, 13, 8, 14, 0, 13, 4, 12, 3, 10, 9, 7, 10, 2, 14, 14]


def summerer(spil, middel):
    """De fire faktorer lægger op til P(S_faktisk) − middel."""
    return abs(sum(spil['faktorer'][f] for f in FAKTORER) - (spil['point'] - middel)) < 1e-9


# 1. Bordresultater 450

def test_1_holdturnering_viser_holdlisten(gemte_sider):
    status, svar = analyser({'url': HOLD_URL}, hent=gemte_sider)
    assert status == 200
    valg = svar['vaelg']['hold']
    assert len(valg) == 16  # 8 borde, et hold NS og et hold ØV ved hvert
    assert all(re.fullmatch(r'Hold \d+', v['hold']) for v in valg)  # de anonymiserede sider (anonymiser.py)
    hold_5 = next(v['hold'] for v in valg if v['id'] == '2-NS')
    assert {(v['id'], v['retning'], v['bord']) for v in valg if v['hold'] == hold_5} == {('2-NS', 'NS', 2), ('6-OV', 'OV', 6)}


def test_1_holdturnering_alle_spil_og_dd_som_siden(gemte_sider):
    status, svar = analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=gemte_sider)
    assert status == 200
    assert [s['nummer'] for s in svar['spil']] == list(range(1, 17))
    for s in svar['spil']:
        assert s['ddSide'] is not None, s['nummer']
        assert s['ddAfvigelse'] is False, s['nummer']


@pytest.mark.parametrize('hold', ['2-NS', '6-OV'])
def test_1_holdturnering_imp_mod_holdkammeraterne_og_faktorerne(gemte_sider, hold):
    status, svar = analyser({'url': HOLD_URL, 'hold': hold}, hent=gemte_sider)
    assert status == 200
    assert svar['turnering']['form'] == 'hold' and svar['turnering']['skala'] == 'imp'
    assert [s['point'] for s in svar['spil']] == IMP_HOLD_5
    assert svar['resultat']['imp'] == sum(IMP_HOLD_5) == -15
    for s in svar['spil']:
        assert s['spillet'] is True
        assert summerer(s, 0), s['nummer']
    for f in FAKTORER:
        assert svar['faktorer'][f] == pytest.approx(sum(s['faktorer'][f] for s in svar['spil']))


def test_1_holdturnering_fravalgte_spil(gemte_sider):
    # Holdet ved bord 4 NS har ikke spillet spillene ("Spillet er fravalgt").
    status, svar = analyser({'url': HOLD_URL, 'hold': '4-NS'}, hent=gemte_sider)
    assert status == 200
    assert svar['spil'] and all(s['spillet'] is False and s['faktorer'] is None for s in svar['spil'])


# 2. Personligt regnskab 452

def test_2_parturnering_parret_procent_og_point(gemte_sider):
    status, svar = analyser({'url': PAR_URL}, hent=gemte_sider)
    assert status == 200
    assert svar['deltager'] == {'type': 'par', 'nummer': 1}
    assert svar['turnering']['form'] == 'par' and svar['turnering']['skala'] == 'matchpoint'
    assert svar['turnering']['top'] == 14
    assert [s['point'] for s in svar['spil']] == POINT_PAR_1
    assert svar['resultat']['procent'] == pytest.approx(279 / 448 * 100, abs=0.1)
    for s in svar['spil']:
        assert s['ddAfvigelse'] is False, s['nummer']
        assert summerer(s, 7), s['nummer']
    # Funktionen bygger selv adresserne til kortfordelingen og spilresultaterne.
    hentet = ' '.join(gemte_sider.adresser)
    assert 'kortfordeling.php?filename=2151/MT452GT720.XML&tournament=452&section=1' in hentet
    assert 'spilresultater.php?filename=2151/MT452GT720.XML&tournament=452&section=1' in hentet


def test_2_parturnering_spil_uden_resultat():
    regnskab = side('personligt-regnskab-452.html')
    assert regnskab.count('Ø&nbsp;2&spades;&nbsp;') == 1  # spil 32
    hent = GemteSider(erstat={'personligt_regnskab.php': regnskab.replace('Ø&nbsp;2&spades;&nbsp;', 'M')})
    status, svar = analyser({'url': PAR_URL}, hent=hent)
    assert status == 200
    spil32 = svar['spil'][31]
    assert spil32['nummer'] == 32 and spil32['spillet'] is False and spil32['faktorer'] is None
    assert all(s['spillet'] for s in svar['spil'][:31])


# 3. testspil.pbn: DD før og efter udspil som i afprøvningen

def laes_pbn():
    spil, nu = [], {}
    for linje in (DATA / 'testspil.pbn').read_text(encoding='utf-8').splitlines():
        m = re.match(r'\[(\w+) "(.*)"\]', linje.strip())
        if m:
            if m.group(1) == 'Event' and nu:
                spil.append(nu)
                nu = {}
            nu[m.group(1)] = m.group(2)
    return spil + [nu]


@pytest.mark.parametrize('nummer, forventet', [(0, (8, 9)), (1, (9, 9)), (2, (7, 7))])
def test_3_dd_foer_og_efter_udspil(nummer, forventet):
    spil = laes_pbn()[nummer]
    farve = re.fullmatch(r'\d(NT|[CDHS])', spil['Contract']).group(1)
    assert dd_foer_og_efter(spil['Deal'], spil['Declarer'], farve, spil['Lead']) == forventet


# 4. Ugyldige adresser og sidetyper

@pytest.mark.parametrize('krop, status, tekst', [
    ({'url': 'https://example.com/multihold_bordresultater.php'}, 400, 'Det er ikke et link fra resultater.bridge.dk'),
    ({'url': HOLD_URL.replace('https://', 'http://')}, 400, 'Det er ikke et link fra resultater.bridge.dk'),
    ({'url': HOLD_URL.replace('resultater.bridge.dk', 'resultater.bridge.dk.example.com')}, 400,
     'Det er ikke et link fra resultater.bridge.dk'),
    ({'url': 'ikke en adresse'}, 400, 'Det er ikke et link fra resultater.bridge.dk'),
    ({'url': SCORESHEET_URL}, 400, 'Brug Bordresultater eller Personligt regnskab'),
    ({'url': HOLD_URL.replace('multihold_bordresultater', 'startliste')}, 400, 'Brug Bordresultater eller Personligt regnskab'),
    ({}, 400, 'Det er ikke et link fra resultater.bridge.dk'),
    ({'url': HOLD_URL, 'hold': '99-NS'}, 400, 'Holdet findes ikke på siden'),
])
def test_4_fejlsvar(gemte_sider, krop, status, tekst):
    s, svar = analyser(krop, hent=gemte_sider)
    assert (s, svar) == (status, {'fejl': tekst})


def test_4_bridge_dk_svarer_ikke():
    def hent(url):
        raise urllib.error.URLError('timed out')
    assert analyser({'url': HOLD_URL}, hent=hent) == (502, {'fejl': 'bridge.dk svarer ikke lige nu'})


def test_4_side_uden_spil():
    tom = '<html><body><div id="wrapper">Parnummer ikke angivet!</div></body></html>'
    for url, navn in ((HOLD_URL, 'multihold_bordresultater.php'), (PAR_URL, 'personligt_regnskab.php')):
        hent = GemteSider(erstat={navn: tom})
        assert analyser({'url': url}, hent=hent) == (422, {'fejl': 'Siden har ingen spil'})


# 5. Ingen navne uden for holdlisten
# Testsiderne er anonymiserede (anonymiser.py): spillerne hedder "Spiller n" og holdene "Hold n". Svaret må ikke
# indeholde pladsholderne uden for holdlisten. test_ingen_navne.py tjekker, at de rigtige navne ikke er i testdataene.

PLADSHOLDER = re.compile(r'\b(?:Spiller|Hold) \d+\b')


def pladsholdere_paa_siderne():
    return {m for navn in ('bordresultater-450.html', 'spilresultater-452.html', 'personligt-regnskab-452.html',
                           'scoresheet-450.html') for m in PLADSHOLDER.findall(side(navn))}


def test_5_ingen_navne_i_svaret(gemte_sider):
    navne = pladsholdere_paa_siderne()
    assert len(navne) == 45  # 37 spillere og 8 hold
    _, valg = analyser({'url': HOLD_URL}, hent=gemte_sider)
    uden_listen = json.dumps({k: v for k, v in valg.items() if k != 'vaelg'}, ensure_ascii=False)
    svar = [uden_listen,
            json.dumps(analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=gemte_sider)[1], ensure_ascii=False),
            json.dumps(analyser({'url': PAR_URL}, hent=gemte_sider)[1], ensure_ascii=False)]
    for tekst in svar:
        assert not PLADSHOLDER.search(tekst), sorted(set(PLADSHOLDER.findall(tekst)))


# 6. 32 spil på under 30 sekunder uden cache

def test_6_32_spil_under_30_sekunder(gemte_sider):
    start = time.perf_counter()
    status, svar = analyser({'url': PAR_URL}, hent=gemte_sider, cache=None)
    tid = time.perf_counter() - start
    assert status == 200 and len(svar['spil']) == 32
    assert tid < 30, f'{tid:.1f} s'
