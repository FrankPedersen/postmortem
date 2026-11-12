"""Scorer efter § 77, imp efter § 78B, matchpoint efter § 78A og DD mod siderne (trin 4)."""
import pytest

from conftest import side
from postmortem import laes, regn


@pytest.mark.parametrize('kontrakt, stik, zonen, score', [
    ((4, 'S', 0), 10, False, 420), ((4, 'S', 0), 10, True, 620), ((3, 'NT', 0), 9, False, 400),
    ((1, 'NT', 0), 7, False, 90), ((3, 'H', 0), 10, False, 170), ((5, 'D', 0), 11, False, 400),
    ((2, 'H', 1), 8, False, 470), ((2, 'H', 1), 9, False, 570), ((1, 'NT', 1), 9, False, 380),
    ((1, 'S', 2), 7, False, 520), ((4, 'S', 1), 11, True, 990), ((6, 'S', 0), 12, True, 1430),
    ((7, 'NT', 0), 13, False, 1520), ((4, 'S', 1), 7, False, -500), ((2, 'H', 1), 7, True, -200),
    ((4, 'S', 1), 6, False, -800), ((4, 'S', 1), 6, True, -1100), ((4, 'S', 2), 5, True, -2800),
    ((3, 'NT', 0), 8, True, -100),
])
def test_score_efter_paragraf_77(kontrakt, stik, zonen, score):
    # Eksemplerne fra Scoring i bridge og Bilag D i 2 over 1 – Moderne majorstøtte.
    assert regn.score(*kontrakt, stik, zonen) == score


@pytest.mark.parametrize('forskel, imp', [(0, 0), (10, 0), (20, 1), (40, 1), (50, 2), (260, 6), (420, 9), (430, 10),
                                          (2240, 19), (3990, 23), (4000, 24), (-30, -1), (-880, -13)])
def test_imp_efter_paragraf_78b(forskel, imp):
    assert regn.imp(forskel) == imp


def test_matchpoint_efter_paragraf_78a():
    # Spil 1 i turnering 452: par 1 fik +50 mod 100, 90, 50, -110, -110, -110 og -150 = 9 af 14.
    assert regn.matchpoint(50, [100, 90, 50, -110, -110, -110, -150]) == 9


def test_alle_scorer_paa_siderne_foelger_paragraf_77():
    hold = laes.laes_bordresultater(side('bordresultater-450.html'))
    zoner = {n: z for n, (_, z, _) in laes.laes_kortfordeling(side('kortfordeling-452.html')).items()}
    alle = [(s.zone, r) for s in hold.spil for r in s.resultater]
    alle += [(zoner[n], r) for n, (_, rr) in laes.laes_spilresultater(side('spilresultater-452.html')).items() for r in rr]
    talt = 0
    for zone, r in alle:
        if r.spillet and not r.kontrakt.pas:
            k = r.kontrakt
            sc = regn.score(k.niveau, k.farve, k.doblet, r.stik, regn.i_zonen(zone, k.spilfoerer))
            assert (sc if k.spilfoerer in 'NS' else -sc) == r.score_ns
            talt += 1
    assert talt > 300


def test_dd_og_par_som_siden():
    hold = laes.laes_bordresultater(side('bordresultater-450.html'))
    beregnet = regn.dd_og_par([(s.pbn(), s.zone, s.giver) for s in hold.spil[:3]])
    assert [dd for dd, _ in beregnet] == [s.dd_side for s in hold.spil[:3]]
    assert beregnet[0][1] == {'score': 430, 'kontrakter': ['3NT NS+1']}  # siden: "Par: 430 3NT NS+1"
