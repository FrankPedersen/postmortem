"""Læsningen af siderne (trin 3)."""
from conftest import side
from postmortem import laes


def test_kontrakter_og_udspil():
    assert laes.laes_kontrakt('N 4 ♥') == laes.Kontrakt(4, 'H', 0, 'N')
    assert laes.laes_kontrakt('Ø 5♠ D') == laes.Kontrakt(5, 'S', 1, 'E')
    assert laes.laes_kontrakt('V 3UT RD') == laes.Kontrakt(3, 'NT', 2, 'W')
    assert laes.laes_kontrakt('Pas').pas
    assert laes.laes_kontrakt('(Spillet er fravalgt)') is None
    assert laes.laes_udspil('♦ 7') == 'D7' and laes.laes_udspil('♠A') == 'SA' and laes.laes_udspil('♥ T') == 'HT'


def test_bordresultater():
    s = laes.laes_bordresultater(side('bordresultater-450.html'))
    assert s.turnering['dato'] == '2026-11-11' and len(s.spil) == 16
    assert all(len(sp.resultater) == 8 and sp.dd_side for sp in s.spil)
    spil1 = s.spil[0]
    assert spil1.pbn() == 'N:Q43.AJ43.AT83.A6 JT9852.876.7.952 K76.QT92.J5.QJ74 A.K5.KQ9642.KT83'
    bord7 = spil1.resultater[6]
    assert (bord7.kontrakt.tekst(), bord7.kontrakt.spilfoerer, bord7.udspil, bord7.stik, bord7.score_ns) == ('4H', 'S', 'SA', 9, -50)
    assert not spil1.resultater[3].spillet  # bord 4: "Spillet er fravalgt"


def test_parsiderne_stemmer_overens():
    regnskab = laes.laes_personligt_regnskab(side('personligt-regnskab-452.html')).spil
    kort = laes.laes_kortfordeling(side('kortfordeling-452.html'))
    felt = laes.laes_spilresultater(side('spilresultater-452.html'))
    assert len(regnskab) == len(kort) == len(felt) == 32
    assert regnskab[2].score_ns == -480 and regnskab[2].retning == 'NS'  # ØV-kolonnen viser tallet set fra NS
    for nummer, egen in regnskab.items():
        dd, resultater = felt[nummer]
        assert dd is not None
        bordet = [r for r in resultater if 1 in (r.ns_nr, r.ov_nr)]
        assert [r.score_ns for r in bordet] == [egen.score_ns], nummer
    # Kortfordelingens hænder er de samme som i Bridge Solver-linket på spilresultaterne.
    for nummer, blok in laes.blokke(side('spilresultater-452.html')).items():
        assert laes.laes_solver_link(blok)[2] == kort[nummer][2], nummer
