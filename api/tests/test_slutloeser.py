"""Accepttest 1 og 2 i SPEC-postmortem-1b-maerker.md, skrevet før løseren.

1. Uden tilvalg giver slutstillingsløseren DDS' tal på alle slutstillinger og på 300 tilfældige stillinger
   (3-6 kort pr. hånd, sans og trumf, alle fire i udspil; fast frø).
2. V i testsættet er som i tabellen.
"""
import random

import pytest
from endplay.dds import solve_board
from endplay.types import Deal

from pbnfil import SLUTSTILLINGER, haender
from postmortem import slutloeser
from postmortem.regn import FARVER, SPILLERE

PLADSER = 'NESW'
RANG = 'AKQJT98765432'


def dds_ns(h, trumf, udspiller):
    """Nord-Syds stik efter DDS: tallet gælder siden i tur og vendes, når en modspiller spiller ud."""
    d = Deal('N:' + ' '.join(h[p] for p in PLADSER))
    d.trump = FARVER[trumf]
    d.first = SPILLERE[udspiller]
    i_tur = max(t for _, t in solve_board(d))
    antal = len(h['S'].replace('.', ''))
    return i_tur if udspiller in 'NS' else antal - i_tur


def tilfaeldige(antal=300, froe=20261113):
    r = random.Random(froe)
    bunke = [(f, k) for f in range(4) for k in RANG]
    ud = []
    for i in range(antal):
        n = 3 + i % 4
        kort = r.sample(bunke, 4 * n)
        h = {}
        for j, p in enumerate(PLADSER):
            mine = kort[j * n:(j + 1) * n]
            h[p] = '.'.join(''.join(k for k in RANG if (f, k) in mine) for f in range(4))
        ud.append((h, r.choice(['NT', 'NT', 'S', 'H', 'D', 'C']), PLADSER[i % 4]))
    return ud


@pytest.mark.parametrize('st', SLUTSTILLINGER, ids=lambda st: st['Stilling'])
def test_2_v_i_testsaettet_er_som_i_tabellen(st):
    assert dds_ns(haender(st['Deal']), st['Trump'], 'S') == int(st['V'])


@pytest.mark.parametrize('st', SLUTSTILLINGER, ids=lambda st: st['Stilling'])
def test_1_loeseren_giver_dds_tal_paa_slutstillingerne(st):
    h = haender(st['Deal'])
    for udspiller in PLADSER:
        assert slutloeser.stik(h, st['Trump'], udspiller) == dds_ns(h, st['Trump'], udspiller), udspiller


def test_1_loeseren_giver_dds_tal_paa_300_tilfaeldige_stillinger():
    stillinger = tilfaeldige()
    assert len(stillinger) == 300
    assert {len(h['N'].replace('.', '')) for h, _, _ in stillinger} == {3, 4, 5, 6}
    assert {t for _, t, _ in stillinger} == {'NT', 'S', 'H', 'D', 'C'}
    forkerte = []
    for h, trumf, udspiller in stillinger:
        mit, dds = slutloeser.stik(h, trumf, udspiller), dds_ns(h, trumf, udspiller)
        if mit != dds:
            forkerte.append((h, trumf, udspiller, mit, dds))
    assert not forkerte, forkerte[:3]


def test_1_spilfoerersiden_kan_vaere_oest_vest():
    # Samme stilling set fra den anden side: stikkene lægger op til antallet af kort.
    for h, trumf, udspiller in tilfaeldige(40, froe=7):
        n = len(h['N'].replace('.', ''))
        assert slutloeser.stik(h, trumf, udspiller, spilfoerer='E') == n - slutloeser.stik(h, trumf, udspiller), (h, trumf)


def test_mindst_svarer_paa_om_spilfoerersiden_kan_tage_k_stik():
    h = haender('N:AJ.K.. ..987. 4.2..A KQ.A..')  # T1: 3 stik
    assert slutloeser.mindst(3, h, 'NT', 'S') is True
    assert slutloeser.mindst(4, h, 'NT', 'S') is False
    assert slutloeser.mindst(0, h, 'NT', 'S') is True


def test_tilvalgene_goer_kun_modspillet_staerkere():
    # Med pas ved afkast eller med retten til at give udspillet fra sig kan spilfører aldrig få flere stik.
    for h, trumf, udspiller in tilfaeldige(60, froe=11):
        v = slutloeser.stik(h, trumf, udspiller)
        assert slutloeser.stik(h, trumf, udspiller, pas_ved_afkast='EW') <= v
        assert slutloeser.stik(h, trumf, udspiller, giv_udspil='EW') <= v


def test_pas_ved_afkast_i_t1_og_udspil_i_t5():
    t1 = haender('N:AJ.K.. ..987. 4.2..A KQ.A..')
    assert slutloeser.stik(t1, 'NT', 'S', pas_ved_afkast='W') == 2
    assert slutloeser.stik(t1, 'NT', 'S', pas_ved_afkast='E') == 3
    assert slutloeser.stik(t1, 'NT', 'S', giv_udspil='EW') == 3
    t5 = haender('N:43.2.. ..987. AQ.3.. KJ.A..')
    assert slutloeser.stik(t5, 'NT', 'S', giv_udspil='W') == 1
    assert slutloeser.stik(t5, 'NT', 'S', giv_udspil='E') == 2
    assert slutloeser.stik(t5, 'NT', 'S', pas_ved_afkast='EW') == 2


def test_en_stilling_midt_i_et_stik():
    # T1 efter klør es fra Syd: Vest skal lægge til. Med pas beholder Vest alle sine kort.
    h = haender('N:AJ.K.. ..987. 4.2.. KQ.A..')
    assert slutloeser.stik(h, 'NT', 'S', igang=['CA']) == 3
    assert slutloeser.stik(h, 'NT', 'S', igang=['CA'], pas_ved_afkast='W') == 2


def test_fristen_stopper_loeseren():
    h, trumf, udspiller = tilfaeldige(4, froe=3)[3]  # seks kort pr. hånd
    with pytest.raises(slutloeser.TidenUde):
        slutloeser.stik(h, trumf, udspiller, pas_ved_afkast='EW', frist=0.0)


# En enkel reference til de to tilvalg: minimax uden ækvivalente kort og uden rækkefølge af træk. DDS kan ikke regne
# de tænkte spil, så løseren sammenlignes her med en uafhængig, langsom udgave på små stillinger.

def reference(h, trumf, udspiller, pas=(), giv=()):
    from functools import lru_cache
    farver = 'SHDC'
    start = tuple(frozenset((farver[f], RANG.index(k)) for f, del_ in enumerate(h[p].split('.')) for k in del_)
                  for p in PLADSER)

    def vinder(stik):
        bedst = stik[0]
        for plads, (f, r) in stik[1:]:
            if (f == bedst[1][0] and r < bedst[1][1]) or (f == trumf and bedst[1][0] != trumf):
                bedst = (plads, (f, r))
        return bedst[0]

    @lru_cache(maxsize=None)
    def inde(haender, leder, rest):
        """Nord-Syds stik, når `leder` er inde."""
        if rest == 0:
            return 0
        v = spil_ud(haender, leder, rest)
        if PLADSER[leder] in giv:
            v = min(v, max(spil_ud(haender, 0, rest), spil_ud(haender, 2, rest)))
        return v

    def spil_ud(haender, leder, rest):
        return laeg(haender, leder, rest, (), 0)

    def laeg(haender, leder, rest, stik, nr):
        """`nr` spillere har haft turen (en, der passede, har ikke lagt et kort)."""
        plads = (leder + nr) % 4
        mine = haender[plads]
        valg = list(mine)
        if nr:
            i_farven = [k for k in mine if k[0] == stik[0][1][0]]
            if i_farven:
                valg = i_farven
            elif PLADSER[plads] in pas:
                valg = [None] + valg
        tal = []
        for k in valg:
            nye = haender if k is None else haender[:plads] + (mine - {k},) + haender[plads + 1:]
            nyt_stik = stik if k is None else stik + ((plads, k),)
            if nr == 3:
                w = vinder(nyt_stik)
                tal.append((1 if w % 2 == 0 else 0) + inde(nye, w, rest - 1))
            else:
                tal.append(laeg(nye, leder, rest, nyt_stik, nr + 1))
        return max(tal) if plads % 2 == 0 else min(tal)

    trumf = None if trumf == 'NT' else trumf
    return inde(start, PLADSER.index(udspiller), len(h['S'].replace('.', '')))


def test_referencen_giver_dds_tal_uden_tilvalg():
    for h, trumf, udspiller in [s for s in tilfaeldige(120, froe=31) if len(s[0]['N'].replace('.', '')) <= 4]:
        assert reference(h, trumf, udspiller) == dds_ns(h, trumf, udspiller)


@pytest.mark.parametrize('tilvalg', ['pas_ved_afkast', 'giv_udspil'])
@pytest.mark.parametrize('hvem', ['EW', 'E', 'W'])
def test_tilvalgene_giver_samme_tal_som_referencen(tilvalg, hvem):
    stillinger = [s for s in tilfaeldige(240, froe=17) if len(s[0]['N'].replace('.', '')) <= 4]
    assert len(stillinger) == 120
    forkerte = []
    for h, trumf, udspiller in stillinger:
        mit = slutloeser.stik(h, trumf, udspiller, **{tilvalg: hvem})
        ref = reference(h, trumf, udspiller, **{'pas' if tilvalg == 'pas_ved_afkast' else 'giv': hvem})
        if mit != ref:
            forkerte.append((h, trumf, udspiller, mit, ref))
    assert not forkerte, forkerte[:3]


@pytest.mark.parametrize('st', SLUTSTILLINGER, ids=lambda st: st['Stilling'])
def test_tilvalgene_paa_slutstillingerne_som_referencen(st):
    h = haender(st['Deal'])
    if len(h['S'].replace('.', '')) > 5:
        pytest.skip('referencen er for langsom til seks kort')
    for hvem in ('EW', 'E', 'W'):
        assert slutloeser.stik(h, st['Trump'], 'S', pas_ved_afkast=hvem) == reference(h, st['Trump'], 'S', pas=hvem)
        assert slutloeser.stik(h, st['Trump'], 'S', giv_udspil=hvem) == reference(h, st['Trump'], 'S', giv=hvem)
