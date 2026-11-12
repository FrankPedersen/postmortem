"""DD, scorer og point (trin 4).

DDS' stiktal gælder den side, der er i tur. Efter udspillet er bordet i tur, så tallet er spilførersidens og skal ikke
vendes (afprøvningen, NOTAT-afproevning.md). DD før udspil er DD-tabellens tal for spilfører i kontraktens farve.
"""
import threading

from endplay.dds import calc_all_tables, calc_dd_table, par, solve_board
from endplay.types import Card, Deal, Denom, Player, Vul

SPILLERE = {'N': Player.north, 'E': Player.east, 'S': Player.south, 'W': Player.west}
FARVER = {'C': Denom.clubs, 'D': Denom.diamonds, 'H': Denom.hearts, 'S': Denom.spades, 'NT': Denom.nt}
ZONER = {'None': Vul.none, 'NS': Vul.ns, 'EW': Vul.ew, 'All': Vul.both}
BOGSTAV = {v: k for k, v in FARVER.items()}

# DDS må ikke kaldes fra flere tråde på én gang gennem endplay.
_LAAS = threading.Lock()


def _som_dict(tabel):
    return {s: {f: tabel[FARVER[f], SPILLERE[s]] for f in FARVER} for s in SPILLERE}


def dd_tabel(deal):
    """{'N': {'C': 8, 'D': ..., 'H': ..., 'S': ..., 'NT': ...}, 'E': ..., 'S': ..., 'W': ...}"""
    with _LAAS:
        return _som_dict(calc_dd_table(Deal(deal)))


def _par(raa, zone, giver):
    pl = par(raa, ZONER.get(zone, Vul.none), SPILLERE.get(giver, Player.north))
    kontrakter = []
    for k in pl:
        farve = BOGSTAV[k.denom]
        doblet = {'doubled': 'X', 'redoubled': 'XX'}.get(k.penalty.name, '')
        side = 'NS' if k.declarer in (Player.north, Player.south) else 'OV'
        resultat = '=' if k.result == 0 else format(k.result, '+d')
        kontrakter.append(f'{k.level}{farve}{doblet} {side}{resultat}')
    return {'score': pl.score, 'kontrakter': sorted(set(kontrakter))}


def dd_og_par(spil):
    """DD-tabel og par for mange spil i ét DDS-kald.

    spil: [(deal, zone, giver)]. Giver [(tabel, {'score': par-score set fra NS, 'kontrakter': ['3NT NS+1', ...]})].
    """
    if not spil:
        return []
    with _LAAS:
        tabeller = calc_all_tables([Deal(d) for d, _, _ in spil])
        return [(_som_dict(t), _par(t, zone, giver)) for t, (_, zone, giver) in zip(tabeller, spil)]


def dd_efter_udspil(deal, spilfoerer, farve, udspil):
    """Spilførersidens max stik efter udspillet, eller None, hvis udspillet ikke er i udspillerens hånd."""
    d = Deal(deal)
    d.trump = FARVER[farve]
    d.first = SPILLERE[spilfoerer].lho
    kort = Card(udspil)
    if kort not in d[d.first]:
        return None
    with _LAAS:
        d.play(kort)
        return max(t for _, t in solve_board(d))


def dd_foer_og_efter(deal, spilfoerer, farve, udspil):
    """(max stik før udspil, max stik efter udspillet) for spilførersiden."""
    return dd_tabel(deal)[spilfoerer][farve], dd_efter_udspil(deal, spilfoerer, farve, udspil)


def i_zonen(zone, spilfoerer):
    return zone == 'All' or (zone == 'NS' and spilfoerer in 'NS') or (zone == 'EW' and spilfoerer in 'EW')


def score(niveau, farve, doblet, stik, zonen):
    """Scoren for spilførersiden efter § 77 (Love for Turneringsbridge 2017): positiv, når kontrakten vinder."""
    if niveau == 0:
        return 0
    noedvendige = niveau + 6
    if stik < noedvendige:
        bet = noedvendige - stik
        if doblet == 0:
            return -bet * (100 if zonen else 50)
        straf = 200 + 300 * (bet - 1) if zonen else sum((100, 200, 200)[:bet]) + 300 * max(0, bet - 3)
        return -straf * doblet
    pr_traek = 20 if farve in ('C', 'D') else 30
    traekvaerdi = (pr_traek * niveau + (10 if farve == 'NT' else 0)) * (1, 2, 4)[doblet]
    point = traekvaerdi + ((500 if zonen else 300) if traekvaerdi >= 100 else 50)
    if niveau == 6:
        point += 750 if zonen else 500
    if niveau == 7:
        point += 1500 if zonen else 1000
    point += (0, 50, 100)[doblet]
    overtraek = stik - noedvendige
    point += overtraek * (pr_traek if doblet == 0 else (200 if zonen else 100) * doblet)
    return point


IMP_SKALA = [20, 50, 90, 130, 170, 220, 270, 320, 370, 430, 500, 600, 750, 900, 1100, 1300, 1500, 1750, 2000,
             2250, 2500, 3000, 3500, 4000]


def imp(forskel):
    """Imp for en forskel i spilpoint efter § 78B."""
    tal = sum(1 for graense in IMP_SKALA if abs(forskel) >= graense)
    return tal if forskel >= 0 else -tal


def matchpoint(s, felt):
    """Parpoint efter § 78A: 2 for hver dårligere score i feltet, 1 for hver lige og 0 for hver bedre."""
    return sum(2 if s > f else 1 if s == f else 0 for f in felt)
