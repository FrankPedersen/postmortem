"""Accepttest 1–4 og 7 i SPEC-postmortem-1d-point.md, skrevet før bygningen: point og procent som bridge.dk.

Aftenen 16. november 2026, sektion Par Gul, par 1 (de anonymiserede sider *-3287.html). bridge.dk's personlige regnskab
er facit: 32 spil med top 14, i alt 225,9 point af 448 = 50,4 %. Spil 32 er spillet 7 gange (en justeret score, "M", ved
et andet bord) og skaleres med Neubergs formel: P' = (P + 1) · N / n − 1. Spil 7 og 16 har pas hele vejen rundt ("P")
ved andre borde.
"""
import json
import re
from decimal import ROUND_HALF_UP, Decimal

import pytest

from conftest import API, HOLD_URL, PAR_3287_URL, PAR_URL, GemteSider, side
from postmortem import laes, regn
from postmortem.analyse import analyser

FAKTORER = ('meldinger', 'spilfoering', 'modspil', 'held')
TESTSVAR = API.parent / 'src' / 'test' / 'data'

# Det personlige regnskab for par 1 (personligt-regnskab-3287.html): parrets point og procent pr. spil, som siden viser
# dem (én decimal), og rundernes point. Par 1 sad Nord–Syd hele aftenen.
POINT_3287 = [4, 11, 10, 10, 8, 6, 0, 3, 6, 8, 12, 8, 10, 4, 0, 12,
              2, 11, 12, 2, 8, 11, 13, 2, 1, 6, 6, 10, 6, 10, 8, 5.9]
PROCENT_3287 = [28.6, 78.6, 71.4, 71.4, 57.1, 42.9, 0.0, 21.4, 42.9, 57.1, 85.7, 57.1, 71.4, 28.6, 0.0, 85.7,
                14.3, 78.6, 85.7, 14.3, 57.1, 78.6, 92.9, 14.3, 7.1, 42.9, 42.9, 71.4, 42.9, 71.4, 57.1, 41.8]
RUNDER_3287 = [35.0, 17.0, 34.0, 26.0, 27.0, 34.0, 23.0, 29.9]
# Regnskabet for par 1 den 4. november (personligt-regnskab-452.html), som i test_accept.py.
POINT_452 = [9, 2, 6, 13, 14, 12, 11, 13, 10, 13, 0, 6, 5, 3, 3, 14,
             12, 13, 8, 14, 0, 13, 4, 12, 3, 10, 9, 7, 10, 2, 14, 14]


def rund1(x):
    """Én decimal som bridge.dk: 0,05 rundes væk fra nul."""
    return float(Decimal(f'{x:.9f}').quantize(Decimal('0.1'), rounding=ROUND_HALF_UP))


@pytest.fixture(scope='module')
def aften():
    status, svar = analyser({'url': PAR_3287_URL}, hent=GemteSider())
    assert status == 200
    return svar


# 1. Aftenen 16. november: 225,9 point og 50,4 % som bridge.dk

def test_1_aftenen_16_november_har_225_9_point_og_50_4_procent(aften):
    t = aften['turnering']
    assert (t['dato'], t['navn'], t['sektion']) == ('2026-11-16', 'Efterårs Hold og Par, Par Gul', '7')
    assert aften['deltager'] == {'type': 'par', 'nummer': 1}
    assert len(aften['spil']) == 32 and all(s['spillet'] for s in aften['spil'])
    assert t['top'] == 14
    assert aften['resultat']['top'] == 32 * 14 == 448
    assert rund1(aften['resultat']['point']) == 225.9
    assert aften['resultat']['procent'] == 50.4


# 2. Point pr. spil som bridge.dk

def test_2_point_og_procent_pr_spil_som_bridge_dk(aften):
    assert [s['top'] for s in aften['spil']] == [14] * 32
    assert [rund1(s['point']) for s in aften['spil']] == POINT_3287
    assert [s['procent'] for s in aften['spil']] == PROCENT_3287
    # Rundernes point (fire spil pr. runde) er summen af de uafrundede point, afrundet som på siden.
    point = [s['point'] for s in aften['spil']]
    assert [rund1(sum(point[i:i + 4])) for i in range(0, 32, 4)] == RUNDER_3287


def test_2_regnskabets_point_laeses_fra_siden():
    for navn, facit in (('personligt-regnskab-3287.html', POINT_3287), ('personligt-regnskab-452.html', POINT_452)):
        regnskab = laes.laes_personligt_regnskab(side(navn))
        assert [regnskab.spil[n].point for n in sorted(regnskab.spil)] == facit, navn


def test_2_pas_hele_vejen_rundt_ved_et_andet_bord_er_med_i_feltet(aften):
    assert laes.laes_kontrakt('P') == laes.Kontrakt(pas=True)
    spil7, spil16 = aften['spil'][6], aften['spil'][15]
    assert len(spil7['felt']) == 7 and spil7['felt'].count(0) == 4   # fire borde meldte pas
    assert len(spil16['felt']) == 7 and spil16['felt'].count(0) == 1
    assert (spil7['point'], spil16['point']) == (0, 12)


def test_2_en_justeret_score_ved_et_andet_bord_er_ikke_med_i_feltet(aften):
    spil32 = aften['spil'][31]
    assert len(spil32['felt']) == 6                     # 8 borde, én justeret score og jeres eget resultat
    assert spil32['point'] == pytest.approx(6 * 8 / 7 - 1)   # 5 point med top 12, skaleret til top 14
    assert spil32['top'] == 14 and spil32['procent'] == 41.8


def test_2_en_justeret_score_ved_jeres_bord_faar_bridge_dks_point():
    # Spil 5 uden kontrakt i regnskabet, som når bridge.dk har justeret scoren ved jeres bord: siden giver 8,0 point.
    regnskab = side('personligt-regnskab-3287.html')
    raekker = regnskab.split('<li class="table">')
    i = next(i for i, r in enumerate(raekker) if '#B5"' in r)
    assert raekker[i].count('N&nbsp;3UT&nbsp;') == 1
    raekker[i] = raekker[i].replace('N&nbsp;3UT&nbsp;', 'M')
    status, svar = analyser({'url': PAR_3287_URL}, hent=GemteSider(erstat={'personligt_regnskab.php': '<li class="table">'.join(raekker)}))
    assert status == 200
    spil5 = svar['spil'][4]
    assert spil5['spillet'] is False and spil5['faktorer'] is None
    assert (spil5['point'], spil5['top'], spil5['procent']) == (8, 14, 57.1)
    assert rund1(svar['resultat']['point']) == 225.9 and svar['resultat']['top'] == 448
    assert svar['resultat']['procent'] == 50.4
    # Spillets afvigelse fra middel står under Held og uheld, så summen stadig er jeres point mod middel.
    assert sum(svar['faktorer'].values()) == pytest.approx(svar['resultat']['point'] - 224)


# 3. Neubergs formel med N = 8

@pytest.mark.parametrize('P, n, forventet', [
    (0, 8, 0), (5, 8, 5), (14, 8, 14),
    (0, 7, 1 / 7), (5, 7, 41 / 7), (6, 7, 7), (12, 7, 97 / 7),
    (0, 6, 1 / 3), (5, 6, 7), (10, 6, 41 / 3),
])
def test_3_neubergs_formel(P, n, forventet):
    assert regn.neuberg(P, n, 8) == pytest.approx(forventet)


def test_3_uden_skalering_er_pointene_uaendrede():
    assert regn.neuberg(5, 8, 8) == 5 and isinstance(regn.neuberg(5, 8, 8), int)


@pytest.mark.parametrize('n', [6, 7, 8])
def test_3_middel_bliver_middel(n):
    assert regn.neuberg(n - 1, n, 8) == pytest.approx(7)


def test_3_parpoint_mod_feltet_som_spil_32():
    # Jeres −140 mod de seks andre resultater: 2 slået, 1 delt = 5 af 12, skaleret til 41/7 af 14.
    felt = [100, 100, -100, -140, -170, -170]
    assert regn.matchpoint(-140, felt) == 5
    assert regn.parpoint(-140, felt, 8) == pytest.approx(41 / 7)
    assert regn.parpoint(-140, felt + [-200], 8) == regn.matchpoint(-140, felt + [-200]) == 7


# 4. Teleskopsummen efter skaleringen

def test_4_teleskopsummen_gaar_op_pr_spil_og_i_alt(aften):
    for s in aften['spil']:
        assert sum(s['faktorer'][f] for f in FAKTORER) == pytest.approx(s['point'] - 7), s['nummer']
    for f in FAKTORER:
        assert aften['faktorer'][f] == pytest.approx(sum(s['faktorer'][f] for s in aften['spil']))
    i_alt = sum(aften['faktorer'][f] for f in FAKTORER)
    assert i_alt == pytest.approx(aften['resultat']['point'] - 224)
    assert rund1(i_alt) == 1.9   # 225,9 − 224


def test_4_faktorerne_skaleres_med_N_over_n(aften):
    # Spil 32 er spillet 7 gange: faktorerne er heltal (point med top 12) gange 8/7.
    spil32 = aften['spil'][31]
    for f in FAKTORER:
        uskaleret = spil32['faktorer'][f] * 7 / 8
        assert uskaleret == pytest.approx(round(uskaleret)), f
    assert sum(spil32['faktorer'].values()) == pytest.approx((5 - 6) * 8 / 7)


# 7. Uændret: holdturnering, dobbeltdummy, mærker og råd

def test_7_holdturneringen_er_uaendret():
    foer = json.loads((TESTSVAR / 'hold-450.json').read_text(encoding='utf-8'))
    assert analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider())[1] == foer


def test_7_parturneringen_4_november_er_uaendret_paa_naer_procenten_med_en_decimal():
    foer = json.loads((TESTSVAR / 'par-452.json').read_text(encoding='utf-8'))
    nu = analyser({'url': PAR_URL}, hent=GemteSider())[1]
    assert nu['resultat']['procent'] == 62.3   # 279 / 448 = 62,28 %, som bridge.dk viser med én decimal
    assert {**nu, 'resultat': {**nu['resultat'], 'procent': None}} == {**foer, 'resultat': {**foer['resultat'], 'procent': None}}


# Felterne, der ikke afhænger af pointene: dobbeltdummy, kontrakten ved bordet, mærkerne, rådene og linjen.
UAENDREDE = ('nummer', 'giver', 'zone', 'haender', 'ddTabel', 'ddSide', 'ddAfvigelse', 'par', 'retning', 'spillet',
             'kontrakt', 'spilfoerer', 'udspil', 'stik', 'score', 'ddFoer', 'ddEfter', 'scorer', 'maerker', 'teknik',
             'raad', 'linje')


def test_7_dobbeltdummy_maerker_og_raad_for_16_november_er_som_foer(aften):
    # par-3287.json blev lavet med funktionen fra før bygningen (README); kun pointene og faktorerne må ændre sig.
    foer = json.loads((TESTSVAR / 'par-3287.json').read_text(encoding='utf-8'))
    assert len(aften['spil']) == len(foer['spil'])
    for a, b in zip(aften['spil'], foer['spil']):
        assert {k: a[k] for k in UAENDREDE} == {k: b[k] for k in UAENDREDE}, a['nummer']
    assert aften['teknikker'] == foer['teknikker']
    assert {k: aften['turnering'][k] for k in aften['turnering'] if k != 'top'} == \
           {k: foer['turnering'][k] for k in foer['turnering'] if k != 'top'}


def test_appens_testsvar_for_16_november_er_funktionens_svar(aften):
    # Som test_teknik_svar.py for de to andre svar: src/test/data/par-3287.json skal følge funktionen (README).
    assert aften == json.loads((TESTSVAR / 'par-3287.json').read_text(encoding='utf-8'))
