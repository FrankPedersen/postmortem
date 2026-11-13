"""Accepttest 8 i SPEC-postmortem-1b-maerker.md: linjen er den samme ved hver kørsel, og hvert kort på den holder DD-tallet."""
import pytest
from endplay.dds import solve_board
from endplay.types import Card, Deal

from pbnfil import HELE_SPIL, SLUTSTILLINGER, TESTSPIL, haender
from postmortem import teknik
from postmortem.regn import FARVER, SPILLERE

PLADSER = 'NESW'


def holder_dd(h, trumf, udspiller, linje, foerste_er_givet):
    """Spiller linjen igennem i DDS: hvert kort skal være blandt dem, der giver siden i tur flest stik."""
    d = Deal('N:' + ' '.join(h[p] for p in PLADSER))
    d.trump = FARVER[trumf]
    d.first = SPILLERE[udspiller]
    nr = 0
    for stik in linje:
        assert len(stik['kort']) == 4 and stik['udspiller'] in PLADSER and stik['vinder'] in PLADSER
        for kort in stik['kort']:
            if not (nr == 0 and foerste_er_givet):
                tal = {str(c): t for c, t in solve_board(d)}
                spillet = str(Card(kort))
                assert tal[spillet] == max(tal.values()), (nr, kort, tal)
            d.play(Card(kort))
            nr += 1
    return nr


@pytest.mark.parametrize('sp', HELE_SPIL + TESTSPIL, ids=lambda sp: 'spil ' + sp['Board'])
def test_8_hvert_kort_paa_linjen_holder_dd_tallet_i_hele_spil(sp):
    h = haender(sp['Deal'])
    trumf = sp['Contract'][1:].rstrip('X')
    svar = teknik.analyser(h, trumf, sp['Declarer'], udspil=sp['Lead'])
    linje = svar['linje']
    assert len(linje) == 13
    assert linje[0]['kort'][0] == sp['Lead'] and linje[0]['udspiller'] == 'W'
    assert holder_dd(h, trumf, 'W', linje, foerste_er_givet=True) == 52
    # Vinderen af et stik spiller ud til det næste.
    for a, b in zip(linje, linje[1:]):
        assert a['vinder'] == b['udspiller']


@pytest.mark.parametrize('st', SLUTSTILLINGER, ids=lambda st: st['Stilling'])
def test_8_hvert_kort_paa_linjen_holder_dd_tallet_i_slutstillingerne(st):
    h = haender(st['Deal'])
    svar = teknik.analyser(h, st['Trump'], 'S', udspiller='S')
    antal = len(h['S'].replace('.', ''))
    assert len(svar['linje']) == antal
    assert holder_dd(h, st['Trump'], 'S', svar['linje'], foerste_er_givet=False) == 4 * antal


def test_8_linjen_er_den_samme_ved_hver_koersel():
    for sp in HELE_SPIL + TESTSPIL:
        h = haender(sp['Deal'])
        trumf = sp['Contract'][1:].rstrip('X')
        teknik.glem()
        a = teknik.analyser(h, trumf, sp['Declarer'], udspil=sp['Lead'])
        teknik.glem()
        b = teknik.analyser(h, trumf, sp['Declarer'], udspil=sp['Lead'])
        assert a == b, sp['Board']
    for st in SLUTSTILLINGER:
        h = haender(st['Deal'])
        teknik.glem()
        a = teknik.analyser(h, st['Trump'], 'S', udspiller='S')
        teknik.glem()
        assert teknik.analyser(h, st['Trump'], 'S', udspiller='S') == a, st['Stilling']


def test_ukendt_udspil_bruger_modspillets_bedste_udspil():
    # H3: klør 2 koster et stik (12); det bedste udspil holder Syd på 11. Står udspillet forkert, bruges det bedste.
    sp = next(s for s in HELE_SPIL if s['Board'] == 'H3')
    h = haender(sp['Deal'])
    for udspil in (None, 'S3'):   # mangler, eller kortet er ikke på Vests hånd
        svar = teknik.analyser(h, 'NT', 'S', udspil=udspil)
        assert svar['teknik']['udspilAntaget'] is True
        foerste = svar['linje'][0]['kort'][0]
        assert foerste in [k for gruppe in svar['raad']['udspil']['bedste'] for k in gruppe]
        assert svar['raad']['udspil']['faktisk'] is None and svar['raad']['udspil']['pris'] is None
        assert holder_dd(h, 'NT', 'W', svar['linje'], foerste_er_givet=False) == 52
