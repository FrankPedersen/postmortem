"""Accepttest 1, 2 og 7 i SPEC-postmortem-2a-vaerd-at-se-paa.md, skrevet før bygningen: spil værd at se på, mærkerne og
meldesamtalen i funktionens svar (`postmortem/vaerd.py`).

1. Listen for 16. november (Franks svar 2, 17. nov. 2026): de 8 spil med størst omkostning (den negative del af egne
   faktorer), "Vis alle (18)" med resten på −2 point eller et fast mærke og linjen med de uheldige. Mærkerne pr. spil er
   tabellerne under Afklaret. Testen skriver hele listen (`pytest -s` eller `-rP`), så Frank kan se den.
2. Meldesamtalen: fit, udgang og slem for spil 1 og 17, facit holdt op mod DD-tabellen og feltet på alle 32 spil, og
   konstruerede spil, der dækker ja, måske og nej, fit "Nej", konkurrence med trumftallet og holdturnering.
7. Uændret: alt andet i svaret er som i testsvarene i src/test/data/.
"""
import json
import pathlib
import re
from collections import Counter

import pytest

from conftest import API, DATA, HOLD_URL, PAR_3287_URL, PAR_URL, GemteSider
from postmortem import laes, regn
from postmortem.analyse import analyser
from postmortem.laes import Kontrakt

TESTSVAR = API.parent / 'src' / 'test' / 'data'
NYE = ('meldesamtale', 'vaerd')


def vaerd():
    """Modulet hentes i testene, så de fejler hver for sig, før det findes."""
    from postmortem import vaerd as modul
    return modul


@pytest.fixture(scope='module')
def aften():
    status, svar = analyser({'url': PAR_3287_URL}, hent=GemteSider())
    assert status == 200
    return svar


@pytest.fixture(scope='module')
def hold():
    status, svar = analyser({'url': HOLD_URL, 'hold': '2-NS'}, hent=GemteSider())
    assert status == 200
    return svar


@pytest.fixture(scope='module')
def par452():
    status, svar = analyser({'url': PAR_URL}, hent=GemteSider())
    assert status == 200
    return svar


# 1. Listen og mærkerne for 16. november (Afklaret, "Franks svar 2")

LISTE_3287 = [1, 4, 8, 25, 29, 6, 24, 9]
RESTEN_3287 = [5, 21, 14, 11, 13, 32, 17, 18, 22, 19]
UHELDIGE_3287 = [15, 20, 26, 27]

# Mærkerne pr. spil i visningens rækkefølge: (mærke, tal). Tallet er stik for udspil, spilføring og modspil og point for
# meldinger (uden fortegn); de andre mærker har intet tal.
M = lambda navn, tal=None: (navn, tal)  # noqa: E731
MAERKER_3287 = {
    1: [M('slemMisset'), M('meldinger', 14), M('andenKontrakt')],
    2: [M('top'), M('andenKontrakt')],
    3: [],
    4: [M('meldinger', 10), M('andenKontrakt'), M('heldigt')],
    5: [M('meldinger', 2), M('spilfoering', 1), M('heldigt')],
    6: [M('udgangMisset'), M('meldinger', 7)],
    7: [M('bund'), M('spilfoering', 1), M('andenKontrakt')],
    8: [M('bund'), M('modspil', 2)],
    9: [M('modspil', 1)],
    10: [],
    11: [M('top'), M('udgangUdenDaekning'), M('meldinger', 5), M('heldigt')],
    12: [],
    13: [M('udgangMisset'), M('meldinger', 2), M('spilfoering', 1), M('heldigt')],
    14: [M('udspil', 1), M('andenKontrakt')],
    15: [M('bund'), M('andenKontrakt'), M('uheldigt')],
    16: [M('top')],
    17: [M('bund'), M('udgangUdenDaekning'), M('strafdobling'), M('meldinger', 2), M('andenKontrakt')],
    18: [M('top'), M('udgangMisset'), M('meldinger', 2), M('andenKontrakt'), M('heldigt')],
    19: [M('top'), M('udspil', 1), M('andenKontrakt'), M('heldigt')],
    20: [M('bund'), M('andenKontrakt'), M('uheldigt')],
    21: [M('udgangMisset'), M('meldinger', 6), M('heldigt')],
    22: [M('top'), M('udspil', 1), M('heldigt')],
    23: [M('top'), M('andenKontrakt')],
    24: [M('bund'), M('meldinger', 2), M('modspil', 2), M('andenKontrakt')],
    25: [M('bund'), M('meldinger', 1), M('modspil', 1), M('andenKontrakt')],
    26: [M('uheldigt')],
    27: [M('uheldigt')],
    28: [M('andenKontrakt')],
    29: [M('meldinger', 4), M('spilfoering', 1), M('andenKontrakt')],
    30: [M('andenKontrakt')],
    31: [],
    32: [M('meldinger', 16 / 7)],   # −2 point med top 12, skaleret med 8/7 (spillet 7 gange)
}
OMKOSTNING_3287 = {1: -14, 4: -10, 8: -9, 25: -8, 29: -8, 6: -7, 24: -6, 9: -6, 5: -6, 21: -6, 14: -5, 11: -5, 13: -4,
                   32: -16 / 7, 17: -2, 18: -2, 22: -2, 19: -1, 7: -1}
FASTE = {'udgangMisset', 'slemMisset', 'udgangUdenDaekning', 'slemUdenDaekning', 'strafdobling', 'udspil', 'heldigt'}


def maerker(spil):
    return [(m['maerke'], m['tal']) for m in spil['vaerd']['maerker']]


def skriv_listen(svar):
    """Hele listen som tekst til Frank: nummer, spil, kontrakt, procent, omkostning og mærker."""
    v = svar['vaerdAtSePaa']
    spil = {s['nummer']: s for s in svar['spil']}
    linjer = []
    for overskrift, numre in (('Spil værd at se på', v['liste']), ('Vis alle: resten', v['resten'])):
        linjer.append(overskrift)
        for n in numre:
            s = spil[n]
            m = ', '.join(f"{navn}{'' if tal is None else f' {tal:.1f}'}" for navn, tal in maerker(s))
            linjer.append(f"  {n:2} {s['spilfoerer']} {s['kontrakt']:4} {s['procent']:5} {s['vaerd']['omkostning']:7.2f}  {m}")
    linjer.append(f"Uheldige, ingen fejl: {v['uheldige']}")
    return '\n'.join(linjer)


def test_1_listen_for_16_november_er_de_8_dyreste_resten_og_de_uheldige(aften):
    v = aften['vaerdAtSePaa']
    print('\n' + skriv_listen(aften))
    assert v == {'liste': LISTE_3287, 'resten': RESTEN_3287, 'uheldige': UHELDIGE_3287}


def test_1_maerkerne_for_16_november(aften):
    assert len(aften['spil']) == 32
    for s in aften['spil']:
        ventet = MAERKER_3287[s['nummer']]
        faktisk = maerker(s)
        assert [m for m, _ in faktisk] == [m for m, _ in ventet], s['nummer']
        for (_, a), (_, b) in zip(faktisk, ventet):
            assert (a is None and b is None) or a == pytest.approx(b), s['nummer']
        assert s['vaerd']['omkostning'] == pytest.approx(OMKOSTNING_3287.get(s['nummer'], 0)), s['nummer']


def test_1_spil_1_7_12_15_17_19_og_32(aften):
    spil = {s['nummer']: s for s in aften['spil']}
    v = aften['vaerdAtSePaa']
    assert v['liste'][0] == 1 and maerker(spil[1]) == [('slemMisset', None), ('meldinger', 14), ('andenKontrakt', None)]
    # Spil 7: omkostningen er −1 point, og ingen af mærkerne er faste; det er hverken blandt de 8 eller under Vis alle.
    assert 7 not in v['liste'] + v['resten'] + v['uheldige']
    assert spil[7]['vaerd']['omkostning'] == pytest.approx(-1) and not FASTE & {m for m, _ in maerker(spil[7])}
    assert ('strafdobling', None) in maerker(spil[17]) and 17 in v['resten']
    # Spil 19: meldinger +11 tæller ikke, modspil −1 (udspillet) gør; heldigt, og med under Vis alle.
    assert spil[19]['faktorer']['meldinger'] > 0 and spil[19]['vaerd']['omkostning'] == pytest.approx(-1)
    assert ('heldigt', None) in maerker(spil[19]) and 19 in v['resten']
    assert ('uheldigt', None) in maerker(spil[15]) and 15 in v['uheldige'] and 15 not in v['liste'] + v['resten']
    # Spil 12: 2♠ mod feltets 3♠ (samme farve, slags og side) er ikke en anden kontrakt.
    assert spil[12]['kontrakt'] == '2S' and ('andenKontrakt', None) not in maerker(spil[12])
    assert maerker(spil[32])[0][0] == 'meldinger' and maerker(spil[32])[0][1] == pytest.approx(16 / 7)


def noegle(s):
    return (round(s['vaerd']['omkostning'], 9), s['procent'] if s['procent'] is not None else s['point'], s['nummer'])


@pytest.mark.parametrize('navn', ['aften', 'hold', 'par452'])
def test_1_listen_foelger_reglen_paa_alle_tre_testaftener(request, navn):
    """Reglen fra afsnit 1 regnet direkte af mærkerne og omkostningen: de 8 dyreste (kun spil med en omkostning), resten
    med −2 eller lavere eller et fast mærke, og de uheldige på linjen. Ved holdturnering er grænsen −2 imp."""
    svar = request.getfixturevalue(navn)
    spillede = [s for s in svar['spil'] if s['spillet']]
    uheldige = [s['nummer'] for s in spillede if ('uheldigt', None) in maerker(s)]
    med = sorted([s for s in spillede if s['vaerd']['omkostning'] < -1e-9 and s['nummer'] not in uheldige], key=noegle)
    liste = [s['nummer'] for s in med[:8]]
    resten = [s['nummer'] for s in sorted(spillede, key=noegle) if s['nummer'] not in liste + uheldige and
              (s['vaerd']['omkostning'] <= -2 + 1e-9 or FASTE & {m for m, _ in maerker(s)})]
    assert svar['vaerdAtSePaa'] == {'liste': liste, 'resten': resten, 'uheldige': uheldige}
    for s in spillede:
        f = s['faktorer']
        assert s['vaerd']['omkostning'] == pytest.approx(sum(min(0, f[k]) for k in ('meldinger', 'spilfoering', 'modspil')))
    for s in svar['spil']:
        if not s['spillet']:
            assert s['vaerd'] is None and s['meldesamtale'] is None


def test_1_holdturnering_har_hverken_bund_eller_top_og_heldigt_er_0_imp_eller_mere(hold):
    for s in hold['spil']:
        navne = {m for m, _ in maerker(s)}
        assert not navne & {'bund', 'top'}, s['nummer']
        if 'heldigt' in navne:
            assert s['point'] >= 0 and s['vaerd']['omkostning'] < 0
        if 'uheldigt' in navne:
            assert s['point'] < 0 and s['vaerd']['omkostning'] == 0 and s['faktorer']['held'] < 0


def test_1_raekkefoelgen_ved_lighed_og_faerre_end_8(aften):
    """Ved lighed i omkostning kommer laveste procent først og derefter laveste spilnummer; er der færre end 8 spil med
    en omkostning, er der færre på listen. Prøvet med konstruerede spil på vaerd.liste."""
    def spil(n, omk, procent, maerker_=()):
        return {'nummer': n, 'spillet': True, 'procent': procent, 'point': None,
                'vaerd': {'omkostning': omk, 'maerker': [{'maerke': m, 'tal': None} for m in maerker_]}}
    alle = [spil(1, -6, 57.1), spil(2, -6, 42.9), spil(3, -6, 57.1), spil(4, 0, 30, ['strafdobling']),
            spil(5, -1, 80), spil(6, 0, 10, ['bund', 'uheldigt']), spil(7, 0, 90, ['top'])]
    assert vaerd().liste(alle, 'par') == {'liste': [2, 1, 3, 5], 'resten': [4], 'uheldige': [6]}


# 2. Meldesamtalen

def test_2_spil_1_slem_maaske_med_0_af_7_borde(aften):
    m = aften['spil'][0]['meldesamtale']
    sans_hjerter = [{'farve': 'NT', 'stik': 12}, {'farve': 'H', 'stik': 12}]
    assert m['fit'] == {'svar': 'ja', 'farve': 'H', 'kort': 9, 'fordeling': [6, 3]}
    assert m['udgang'] == {'svar': 'ja', 'stik': sans_hjerter, 'borde': 7, 'af': 7, 'meldt': True}
    assert m['slem'] == {'svar': 'maaske', 'stik': sans_hjerter, 'borde': 0, 'af': 7, 'meldt': False}
    # 4♠ + 1 = 450 giver 4 point; med ét stik mere (480) 9 point: 35,7 procentpoint.
    assert m['overstikAfgoerende'] is True
    assert m['ejer'] == {'side': 'jer', 'konkurrence': False,
                         'trumf': {'jer': {'farve': 'H', 'kort': 9}, 'modparten': {'farve': 'S', 'kort': 8}},
                         'bedst': {'spilfoerer': 'jer', 'kontrakter': ['6NT']}}


def test_2_spil_17_udgang_meldt_uden_daekning_og_konkurrence(aften):
    m = aften['spil'][16]['meldesamtale']
    assert m['fit'] == {'svar': 'ja', 'farve': 'C', 'kort': 9, 'fordeling': [7, 2]}
    # Feltet: 4♣ D, 4♣, Ø 3♠, 5♣, 3♣, 3♥ og 5♣ D, så 2 af 7 borde meldte udgang.
    assert m['udgang'] == {'svar': 'nej', 'stik': [{'farve': 'H', 'stik': 8}, {'farve': 'C', 'stik': 8}],
                           'borde': 2, 'af': 7, 'meldt': True}
    assert m['slem'] is None   # "–": slem vises kun ved udgang ja eller måske
    assert m['overstikAfgoerende'] is True
    assert m['ejer'] == {'side': 'modparten', 'konkurrence': True,
                         'trumf': {'jer': {'farve': 'C', 'kort': 9}, 'modparten': {'farve': 'S', 'kort': 8}},
                         'bedst': {'spilfoerer': 'modparten', 'kontrakter': ['3S']}}


SIDE = {'N': 'NS', 'S': 'NS', 'E': 'OV', 'W': 'OV'}
BEHOV = {'NT': 9, 'S': 10, 'H': 10, 'D': 11, 'C': 11}


def ref_udgang(k):
    return not k.pas and (k.niveau >= 5 or (k.farve == 'NT' and k.niveau >= 3) or (k.farve in 'HS' and k.niveau >= 4))


def test_2_facit_for_udgang_og_slem_holdes_op_mod_dd_tabellen_og_feltet(aften):
    """Uafhængig gennemregning på alle 32 spil: stikkene for jeres side er DD-tabellens største tal for de to hænder, og
    feltet er de andre borde på spilresultaterne (justerede scorer tæller ikke)."""
    resultater = laes.laes_spilresultater((DATA / 'spilresultater-3287.html').read_text(encoding='utf-8'))
    for s in aften['spil']:
        mine = ('N', 'S') if s['retning'] == 'NS' else ('E', 'W')
        bedst = {f: max(s['ddTabel'][mine[0]][f], s['ddTabel'][mine[1]][f]) for f in BEHOV}
        felt = [r.kontrakt for r in resultater[s['nummer']][1] if 1 not in (r.ns_nr, r.ov_nr) and r.spillet]
        vore = [k for k in felt if not k.pas and SIDE[k.spilfoerer] == s['retning']]
        m = s['meldesamtale']
        for navn, vinder, paa_niveau in (('udgang', lambda f: bedst[f] >= BEHOV[f], ref_udgang),
                                         ('slem', lambda f: bedst[f] >= 12, lambda k: k.niveau >= 6)):
            felt_m = m[navn]
            if felt_m is None:
                assert navn == 'slem' and m['udgang']['svar'] == 'nej', s['nummer']
                continue
            borde = sum(1 for k in vore if paa_niveau(k))
            ventet = 'nej' if not any(vinder(f) for f in BEHOV) else ('ja' if 2 * borde >= len(felt) else 'maaske')
            assert (felt_m['svar'], felt_m['borde'], felt_m['af']) == (ventet, borde, len(felt)), (s['nummer'], navn)
            # Stikkene i grunden: de vindende benævnelser med flest stik, ellers de benævnelser med flest stik.
            kandidater = [f for f in BEHOV if vinder(f)] or list(BEHOV)
            top = max(bedst[f] for f in kandidater)
            assert felt_m['stik'] == [{'farve': f, 'stik': top} for f in ('NT', 'S', 'H', 'D', 'C')
                                      if f in kandidater and bedst[f] == top], (s['nummer'], navn)


def test_2_overstikket_er_afgoerende_ved_25_procentpoint(aften):
    """Ét stik mere eller mindre ved bordet regnet med feltets scorer og Neubergs formel (N = 8)."""
    antal = 0
    for s in aften['spil']:
        k = s['kontrakt']
        if k == 'Pas':
            assert s['meldesamtale']['overstikAfgoerende'] is None
            continue
        niveau, farve, x = re.fullmatch(r'(\d)(NT|[CDHS])(X*)', k).groups()
        fortegn = 1 if SIDE[s['spilfoerer']] == s['retning'] else -1
        zonen = regn.i_zonen(s['zone'], s['spilfoerer'])
        flyt = []
        for stik in (s['stik'] - 1, s['stik'] + 1):
            if 0 <= stik <= 13:
                S = fortegn * regn.score(int(niveau), farve, len(x), stik, zonen)
                flyt.append(abs(regn.parpoint(S, s['felt'], 8) - s['point']) / s['top'] * 100)
        ventet = max(flyt) >= 25 - 1e-9
        antal += ventet
        assert s['meldesamtale']['overstikAfgoerende'] is ventet, s['nummer']
    assert 0 < antal < 32


def test_2_konkurrence_naar_begge_sider_spillede_en_farvekontrakt(aften):
    """Første session regnede 14 af 32 spil med konkurrence (Afklaret, punkt 2 (a))."""
    med = [s['nummer'] for s in aften['spil'] if s['meldesamtale']['ejer']['konkurrence']]
    assert med == [4, 6, 8, 13, 15, 17, 19, 20, 22, 24, 25, 26, 29, 32]


# Konstruerede spil til vaerd.meldesamtale(haender, dd, par, retning, egen, felt)

HAENDER_8_8 = {'N': 'KQJT9.Q764.A64.6', 'E': '4.98.KQT952.Q932', 'S': '753.AKT5.7.JT754', 'W': 'A862.J32.J83.AK8'}
HAENDER_UDEN_FIT = {'N': 'AKQ2.AK2.432.432', 'E': 'T987.T98.JT9.AKQ', 'S': 'J43.QJ3.AKQ5.765', 'W': '65.7654.876.JT98'}


def dd(ns, ov=None):
    """DD-tabel med samme tal for begge hænder på hver side."""
    ov = ov or {f: 13 - v for f, v in ns.items()}
    return {'N': dict(ns), 'S': dict(ns), 'E': dict(ov), 'W': dict(ov)}


def k(tekst, spilfoerer=''):
    if tekst == 'Pas':
        return Kontrakt(pas=True)
    niveau, farve, x = re.fullmatch(r'(\d)(NT|[CDHS])(X*)', tekst).groups()
    return Kontrakt(int(niveau), farve, len(x), spilfoerer)


SPAR_10 = {'C': 5, 'D': 3, 'H': 9, 'S': 10, 'NT': 8}


def test_2_konstrueret_udgang_ja_maaske_og_nej():
    ms = vaerd().meldesamtale
    par = {'score': 420, 'kontrakter': ['4S NS=']}
    felt_4 = [k('4S', 'N')] * 4 + [k('3S', 'N')] * 3
    m = ms(HAENDER_8_8, dd(SPAR_10), par, 'NS', k('4S', 'N'), felt_4)
    assert m['udgang'] == {'svar': 'ja', 'stik': [{'farve': 'S', 'stik': 10}], 'borde': 4, 'af': 7, 'meldt': True}
    assert m['slem'] == {'svar': 'nej', 'stik': [{'farve': 'S', 'stik': 10}], 'borde': 0, 'af': 7, 'meldt': False}
    felt_1 = [k('4H', 'N')] + [k('3S', 'N')] * 4 + [k('3D', 'E')] * 2
    m = ms(HAENDER_8_8, dd(SPAR_10), par, 'NS', k('3S', 'N'), felt_1)
    assert (m['udgang']['svar'], m['udgang']['borde'], m['udgang']['meldt']) == ('maaske', 1, False)
    ni = {'C': 5, 'D': 3, 'H': 9, 'S': 9, 'NT': 8}
    m = ms(HAENDER_8_8, dd(ni), {'score': 140, 'kontrakter': ['3S NS=']}, 'NS', k('4S', 'N'), felt_4)
    assert m['udgang'] == {'svar': 'nej', 'stik': [{'farve': 'S', 'stik': 9}, {'farve': 'H', 'stik': 9}],
                           'borde': 4, 'af': 7, 'meldt': True}
    assert m['slem'] is None
    assert m['fit'] == {'svar': 'ja', 'farve': 'S', 'kort': 8, 'fordeling': [5, 3]}


def test_2_konstrueret_slem_ja_maaske_og_nej():
    ms = vaerd().meldesamtale
    tolv = {'C': 8, 'D': 9, 'H': 11, 'S': 12, 'NT': 12}
    par = {'score': 990, 'kontrakter': ['6NT NS=', '6S NS=']}
    felt = [k('6NT', 'S')] * 4 + [k('4S', 'N')] * 3
    m = ms(HAENDER_8_8, dd(tolv), par, 'NS', k('6S', 'N'), felt)
    assert m['slem'] == {'svar': 'ja', 'stik': [{'farve': 'NT', 'stik': 12}, {'farve': 'S', 'stik': 12}],
                         'borde': 4, 'af': 7, 'meldt': True}
    m = ms(HAENDER_8_8, dd(tolv), par, 'NS', k('4S', 'N'), [k('4S', 'N')] * 7)
    assert (m['slem']['svar'], m['slem']['borde'], m['slem']['meldt']) == ('maaske', 0, False)
    # Slem meldt uden dækning: 11 stik med åbne kort.
    elleve = {'C': 8, 'D': 9, 'H': 11, 'S': 11, 'NT': 11}
    m = ms(HAENDER_8_8, dd(elleve), {'score': 450, 'kontrakter': ['4S NS+1']}, 'NS', k('6S', 'N'), [k('4S', 'N')] * 7)
    assert m['udgang']['svar'] == 'ja'
    assert m['slem'] == {'svar': 'nej', 'stik': [{'farve': 'NT', 'stik': 11}, {'farve': 'S', 'stik': 11},
                                                 {'farve': 'H', 'stik': 11}], 'borde': 0, 'af': 7, 'meldt': True}


def test_2_konstrueret_fit_nej():
    m = vaerd().meldesamtale(HAENDER_UDEN_FIT, dd({'C': 6, 'D': 8, 'H': 7, 'S': 8, 'NT': 9}),
                             {'score': 400, 'kontrakter': ['3NT NS=']}, 'NS', k('3NT', 'S'), [k('3NT', 'S')] * 7)
    assert m['fit'] == {'svar': 'nej', 'farve': 'S', 'kort': 7, 'fordeling': [4, 3]}
    assert m['ejer']['trumf'] == {'jer': {'farve': 'S', 'kort': 7}, 'modparten': {'farve': 'H', 'kort': 7}}
    assert m['ejer']['konkurrence'] is False and m['ejer']['side'] == 'jer'


def test_2_konstrueret_konkurrence_og_hvem_ejede_spillet():
    ms = vaerd().meldesamtale
    ov = {'C': 7, 'D': 9, 'H': 3, 'S': 2, 'NT': 4}
    par = {'score': -110, 'kontrakter': ['3D OV=']}
    # Ø–V spillede 3♦ ved ét bord og N–S 3♠ ved jeres: konkurrence.
    m = ms(HAENDER_8_8, dd(SPAR_10, ov), par, 'NS', k('3S', 'N'), [k('3D', 'E')] + [k('2NT', 'N')] * 6)
    assert m['ejer'] == {'side': 'modparten', 'konkurrence': True,
                         'trumf': {'jer': {'farve': 'S', 'kort': 8}, 'modparten': {'farve': 'D', 'kort': 9}},
                         'bedst': {'spilfoerer': 'modparten', 'kontrakter': ['3D']}}
    # Ø–V spillede kun sans: ingen konkurrence.
    m = ms(HAENDER_8_8, dd(SPAR_10, ov), par, 'NS', k('3S', 'N'), [k('1NT', 'W')] + [k('2S', 'N')] * 6)
    assert m['ejer']['konkurrence'] is False and m['ejer']['side'] == 'modparten'
    # Set fra Ø–V er det jeres spil, og en offermelding for N–S er det bedste for modparten.
    m = ms(HAENDER_8_8, dd(SPAR_10, ov), {'score': 100, 'kontrakter': ['4SX NS-1']}, 'OV', k('3D', 'E'),
           [k('3S', 'N')] * 7)
    assert m['ejer']['side'] == 'jer' and m['ejer']['bedst'] == {'spilfoerer': 'modparten', 'kontrakter': ['4SX']}
    # Par er pas: ingen ejer.
    m = ms(HAENDER_8_8, dd(SPAR_10, ov), {'score': 0, 'kontrakter': []}, 'NS', k('Pas'), [k('Pas')] * 7)
    assert m['ejer']['side'] is None and m['ejer']['bedst'] == {'spilfoerer': None, 'kontrakter': []}


def test_2_konstrueret_holdturnering_feltet_er_det_andet_bord():
    ms = vaerd().meldesamtale
    par = {'score': 420, 'kontrakter': ['4S NS=']}
    m = ms(HAENDER_8_8, dd(SPAR_10), par, 'NS', k('3S', 'N'), [k('4S', 'S')])
    assert (m['udgang']['svar'], m['udgang']['borde'], m['udgang']['af']) == ('ja', 1, 1)
    m = ms(HAENDER_8_8, dd(SPAR_10), par, 'NS', k('4S', 'N'), [k('2S', 'S')])
    assert (m['udgang']['svar'], m['udgang']['borde'], m['udgang']['af']) == ('maaske', 0, 1)


def test_2_holdturnering_450_har_meldesamtalen_med_det_andet_bord(hold):
    for s in hold['spil']:
        if s['spillet']:
            assert s['meldesamtale']['udgang']['af'] == 1, s['nummer']
            assert s['meldesamtale']['slem'] is None or s['meldesamtale']['slem']['af'] == 1


# 7. Uændret

@pytest.mark.parametrize('navn, krop', [('par-3287', {'url': PAR_3287_URL}), ('par-452', {'url': PAR_URL}),
                                        ('hold-450', {'url': HOLD_URL, 'hold': '2-NS'})])
def test_7_alt_andet_i_svaret_er_som_foer(navn, krop):
    nu = analyser(krop, hent=GemteSider())[1]
    foer = json.loads((TESTSVAR / f'{navn}.json').read_text(encoding='utf-8'))
    uden = lambda svar: {**{k: v for k, v in svar.items() if k != 'vaerdAtSePaa'},  # noqa: E731
                         'spil': [{k: v for k, v in s.items() if k not in NYE} for s in svar['spil']]}
    assert uden(nu) == uden(foer)
