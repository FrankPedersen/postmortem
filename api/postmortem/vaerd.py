"""Spil værd at se på og meldesamtalen (SPEC-postmortem-2a-vaerd-at-se-paa.md).

Alt regnes af det, funktionen allerede har: hænderne, DD-tabellen, par, kontrakten ved bordet, feltets kontrakter og
faktorerne. Intet gemmes.

- `meldesamtale`: fit, udgang og slem for parrets side efter dobbeltdummy og feltet, og hvem der ejede spillet.
- `overstik_afgoerende`: om ét stik mere eller mindre havde flyttet pointene mindst 25 procentpoint (3 imp ved
  holdturnering).
- `maerker`: spillets omkostning (den negative del af meldinger, spilføring og modspil) og mærker.
- `liste`: de 8 spil med størst omkostning, resten under "Vis alle" og de uheldige (Franks svar 2, 17. nov. 2026).

Feltet er de andre borde i parturnering og det andet bord (holdkammeraternes) i holdturnering.
"""
import re
from collections import Counter

from . import regn

BENAEVNELSER = ('NT', 'S', 'H', 'D', 'C')   # rækkefølgen i grunden: sans først, så farverne fra spar
KULOERER = ('S', 'H', 'D', 'C')             # rækkefølgen i hænderne (PBN) og ved lighed i længde
UDGANG = {'NT': 9, 'S': 10, 'H': 10, 'D': 11, 'C': 11}
SLEM = 12
ANTAL = 8                 # spil på listen "Spil værd at se på"
GRAENSE = -2              # omkostningen, der bringer et spil med under "Vis alle" (point eller imp)
BUND, TOP = 25, 75        # procent
AFGOERENDE = {'par': 25, 'hold': 3}   # procentpoint eller imp for "Var overstikket afgørende?"
FASTE = ('udgangMisset', 'slemMisset', 'udgangUdenDaekning', 'slemUdenDaekning', 'strafdobling', 'udspil', 'heldigt')
EPS = 1e-9


def side(plads):
    return 'NS' if plads in ('N', 'S') else 'OV'


def _haender(retning):
    return ('N', 'S') if retning == 'NS' else ('E', 'W')


def er_udgang(k):
    """Udgang eller højere: 3NT, 4♥, 4♠, 5♣ og 5♦ og alt over."""
    return not k.pas and (k.niveau >= 5 or (k.farve == 'NT' and k.niveau >= 3) or (k.farve in ('H', 'S') and k.niveau >= 4))


def er_slem(k):
    return not k.pas and k.niveau >= 6


def slags(k):
    if k.pas:
        return 'pas'
    return 'slem' if er_slem(k) else 'udgang' if er_udgang(k) else 'del'


def _laengste(haender, retning):
    """Sidens længste farve sammen: (farve, kort, [længst på én hånd, den anden]); ved lighed spar, hjerter, ruder, klør."""
    a, b = (haender[p].split('.') for p in _haender(retning))
    laengder = [(f, len(a[i]) + len(b[i]), sorted((len(a[i]), len(b[i])), reverse=True)) for i, f in enumerate(KULOERER)]
    return max(laengder, key=lambda x: x[1])   # max giver den første ved lighed


def _niveau(stik, vinder, borde, af, meldt):
    """Udgang eller slem: ja, når kontrakten vinder med åbne kort, og mindst halvdelen af feltet var der; måske, når den
    vinder, men under halvdelen var der; nej, når den går ned. `stik` i svaret er de vindende benævnelser med flest stik
    (ved nej de benævnelser med flest stik)."""
    vindere = [f for f in BENAEVNELSER if vinder(f)]
    kandidater = vindere or list(BENAEVNELSER)
    flest = max(stik[f] for f in kandidater)
    svar = 'nej' if not vindere else ('ja' if 2 * borde >= af else 'maaske')
    return {'svar': svar, 'stik': [{'farve': f, 'stik': flest} for f in kandidater if stik[f] == flest],
            'borde': borde, 'af': af, 'meldt': meldt}


def _par_kontrakter(par, retning):
    """Par-kontrakterne uden side og resultat ("6NT NS=" -> "6NT") og den side, der spiller dem."""
    kontrakter, spilfoerer = [], None
    for p in par['kontrakter']:
        m = re.fullmatch(r'(\S+)\s+(NS|OV|EW)(=|[+-]\d+)', p)
        if not m:
            continue
        if m.group(1) not in kontrakter:
            kontrakter.append(m.group(1))
        spilfoerer = 'jer' if ('OV' if m.group(2) == 'EW' else m.group(2)) == retning else 'modparten'
    return {'spilfoerer': spilfoerer, 'kontrakter': kontrakter}


def meldesamtale(haender, dd, par, retning, egen, felt):
    """Meldesamtalen for parrets side (afsnit 2).

    haender: {'N': 'AKQ2.AK2.432.432', ...}; dd: DD-tabellen; par: {'score': par-scoren set fra parret, 'kontrakter':
    ['6NT NS=']}; retning: parrets retning; egen: kontrakten ved bordet (laes.Kontrakt); felt: kontrakterne ved de andre
    borde (holdturnering: det andet bord). `overstikAfgoerende` sættes af analysen, der kender pointene.
    """
    mine = _haender(retning)
    stik = {f: max(dd[p][f] for p in mine) for f in BENAEVNELSER}
    vore = [k for k in felt if not k.pas and side(k.spilfoerer) == retning]
    vi = not egen.pas and side(egen.spilfoerer) == retning

    farve, kort, fordeling = _laengste(haender, retning)
    udgang = _niveau(stik, lambda f: stik[f] >= UDGANG[f], sum(1 for k in vore if er_udgang(k)), len(felt),
                     vi and er_udgang(egen))
    slem_meldt = vi and er_slem(egen)
    slem = (_niveau(stik, lambda f: stik[f] >= SLEM, sum(1 for k in vore if er_slem(k)), len(felt), slem_meldt)
            if udgang['svar'] != 'nej' or slem_meldt else None)

    # Konkurrence: begge sider spillede en farvekontrakt ved mindst ét bord, jeres eller feltets (Franks svar 17. nov.).
    alle = [egen, *felt]
    farvekontrakt = lambda s: any(not k.pas and k.farve != 'NT' and side(k.spilfoerer) == s for k in alle)  # noqa: E731
    modside = 'OV' if retning == 'NS' else 'NS'
    trumf = {}
    for navn, s in (('jer', retning), ('modparten', modside)):
        f, n, _ = _laengste(haender, s)
        trumf[navn] = {'farve': f, 'kort': n}
    ejer = {'side': 'jer' if par['score'] > 0 else 'modparten' if par['score'] < 0 else None,
            'konkurrence': farvekontrakt('NS') and farvekontrakt('OV'),
            'trumf': trumf, 'bedst': _par_kontrakter(par, retning)}
    return {'fit': {'svar': 'ja' if kort >= 8 else 'nej', 'farve': farve, 'kort': kort, 'fordeling': fordeling},
            'udgang': udgang, 'slem': slem, 'overstikAfgoerende': None, 'ejer': ejer}


def overstik_afgoerende(k, stik, zone, retning, P, form, top, point):
    """Sand, når ét stik mere eller mindre ved bordet havde flyttet pointene mindst 25 procentpoint (parturnering) eller
    3 imp (holdturnering). P giver pointene for en score set fra parret. None ved pas."""
    if k.pas or stik is None:
        return None
    fortegn = 1 if side(k.spilfoerer) == retning else -1
    zonen = regn.i_zonen(zone, k.spilfoerer)
    flyt = [abs(P(fortegn * regn.score(k.niveau, k.farve, k.doblet, t, zonen)) - point)
            for t in (stik - 1, stik + 1) if 0 <= t <= 13]
    if form == 'par':
        return max(flyt) / top * 100 >= AFGOERENDE['par'] - EPS
    return max(flyt) >= AFGOERENDE['hold'] - EPS


def maerker(x, egen, felt, form):
    """Spillets omkostning og mærker i visningens rækkefølge (afsnit 1): bund og top, de faste mærker, meldinger,
    spilføring og modspil, anden kontrakt end feltet og til sidst heldigt eller uheldigt. `tal` er stik for udspil,
    spilføring og modspil og point (imp) for meldinger, uden fortegn."""
    f = x['faktorer']
    omkostning = sum(min(0, f[k]) for k in ('meldinger', 'spilfoering', 'modspil'))
    ud = []

    def m(navn, tal=None):
        ud.append({'maerke': navn, 'tal': tal})

    par = form == 'par'
    if par and x['procent'] < BUND:
        m('bund')
    if par and x['procent'] > TOP:
        m('top')
    ms = x['meldesamtale']
    u, sl = ms['udgang'], ms['slem']
    # Misset kun, når I var spilfører, eller alle passede (forslag 6).
    egen_melding = egen.pas or side(egen.spilfoerer) == x['retning']
    if egen_melding and u['svar'] in ('ja', 'maaske') and not u['meldt']:
        m('udgangMisset')
    if egen_melding and sl and sl['svar'] in ('ja', 'maaske') and not sl['meldt']:
        m('slemMisset')
    if u['meldt'] and not (sl and sl['meldt']) and u['svar'] == 'nej':
        m('udgangUdenDaekning')
    if sl and sl['meldt'] and sl['svar'] == 'nej':
        m('slemUdenDaekning')
    if egen.doblet:
        m('strafdobling')
    ue = x['udspilseffekt']
    if ue and ue['udspilAf'] == 'parret' and x['ddEfter'] is not None and x['ddEfter'] - x['ddFoer'] >= 1:
        m('udspil', x['ddEfter'] - x['ddFoer'])
    efter = x['ddEfter'] if x['ddEfter'] is not None else x['ddFoer']
    if f['meldinger'] < -EPS:
        m('meldinger', -f['meldinger'])
    if f['spilfoering'] < -EPS and efter is not None and efter - x['stik'] > 0:
        m('spilfoering', efter - x['stik'])
    # Er modspillet kun negativt på grund af udspillet, står kun udspillet (forslag 8).
    if f['modspil'] < -EPS and efter is not None and x['stik'] - efter > 0:
        m('modspil', x['stik'] - efter)
    if felt:
        # Farve (sans regnes som en farve), side og slags; et andet niveau af samme slags tæller ikke (forslag 7).
        noegle = lambda k: ('pas',) if k.pas else (k.farve, side(k.spilfoerer), slags(k))  # noqa: E731
        antal = Counter(noegle(k) for k in felt)
        flest = max(antal.values())
        if noegle(egen) not in {k for k, v in antal.items() if v == flest}:
            m('andenKontrakt')
    godt = x['procent'] >= 50 if par else x['point'] >= 0
    if godt and omkostning < -EPS:
        m('heldigt')
    if not godt and omkostning > -EPS and f['held'] < -EPS:
        m('uheldigt')
    return {'omkostning': omkostning, 'maerker': ud}


def liste(spil, form):
    """Listen for aftenen (Franks svar 2): de 8 spil med størst omkostning (færre, hvis færre har en), resten med en
    omkostning på −2 eller lavere eller et fast mærke, og de uheldige. Ved lighed laveste procent (imp), så spilnummer."""
    med_maerker = [s for s in spil if s.get('spillet') and s.get('vaerd')]

    def navne(s):
        return {m['maerke'] for m in s['vaerd']['maerker']}

    def noegle(s):
        return (round(s['vaerd']['omkostning'], 9), s['procent'] if form == 'par' else s['point'], s['nummer'])

    uheldige = [s['nummer'] for s in med_maerker if 'uheldigt' in navne(s)]
    kandidater = sorted((s for s in med_maerker if s['vaerd']['omkostning'] < -EPS and s['nummer'] not in uheldige),
                        key=noegle)
    de_8 = [s['nummer'] for s in kandidater[:ANTAL]]
    resten = [s['nummer'] for s in sorted(med_maerker, key=noegle)
              if s['nummer'] not in de_8 and s['nummer'] not in uheldige
              and (s['vaerd']['omkostning'] <= GRAENSE + EPS or navne(s) & set(FASTE))]
    return {'liste': de_8, 'resten': resten, 'uheldige': uheldige}
