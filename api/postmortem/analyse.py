"""Indgangen: et link fra resultater.bridge.dk ind, svaret som JSON ud (SPEC-postmortem-1a-funktion.md).

analyser(krop, hent, cache) giver (statuskode, svar). `hent` henter en side som tekst (testene giver de gemte sider),
og `cache` gemmer DD-beregningerne (cache.py). Navne fra siderne bruges kun til holdlisten og til at finde
holdkammeraternes bord; de står aldrig i svaret uden for holdlisten.
"""
import hashlib
import http.client
import urllib.error
import urllib.parse

from . import laes, regn
from .hent import IkkeBridgeDk, er_bridge_dk, hent_side

IKKE_BRIDGE_DK = 'Det er ikke et link fra resultater.bridge.dk'
BRUG_SIDETYPE = 'Brug Bordresultater eller Personligt regnskab'
SVARER_IKKE = 'bridge.dk svarer ikke lige nu'
INGEN_SPIL = 'Siden har ingen spil'
UKENDT_HOLD = 'Holdet findes ikke på siden'

HOLD_SIDE = 'multihold_bordresultater.php'
REGNSKAB_SIDE = 'personligt_regnskab.php'
FAKTORER = ('meldinger', 'spilfoering', 'modspil', 'held')


def fejl(tekst):
    return {'fejl': tekst}


def analyser(krop, hent=None, cache=None):
    hent = hent or hent_side
    url = krop.get('url') if isinstance(krop, dict) else None
    if not isinstance(url, str) or not er_bridge_dk(url):
        return 400, fejl(IKKE_BRIDGE_DK)
    dele = urllib.parse.urlsplit(url)
    sidetype = dele.path.rsplit('/', 1)[-1]
    if sidetype not in (HOLD_SIDE, REGNSKAB_SIDE):
        return 400, fejl(BRUG_SIDETYPE)
    q = {k: v[0] for k, v in urllib.parse.parse_qs(dele.query).items()}
    try:
        if sidetype == HOLD_SIDE:
            return _holdturnering(url, q, krop.get('hold'), hent, cache)
        return _parturnering(url, q, hent, cache)
    except IkkeBridgeDk:
        return 400, fejl(IKKE_BRIDGE_DK)
    except (urllib.error.URLError, TimeoutError, OSError, http.client.HTTPException):
        return 502, fejl(SVARER_IKKE)


# Holdturnering

def holdliste(side):
    """Holdene ved hvert bord: [{'id': '2-NS', 'hold': navn, 'retning': 'NS', 'bord': 2}, ...]"""
    borde = {}
    for spil in side.spil:
        for r in spil.resultater:
            if r.bord is not None and r.bord not in borde and r.ns_navn:
                borde[r.bord] = (r.ns_navn, r.ov_navn)
    liste = []
    for bord, (ns, ov) in sorted(borde.items()):
        liste.append({'id': f'{bord}-NS', 'hold': ns, 'retning': 'NS', 'bord': bord})
        liste.append({'id': f'{bord}-OV', 'hold': ov, 'retning': 'OV', 'bord': bord})
    return liste


def _holdturnering(url, q, hold_id, hent, cache):
    side = laes.laes_bordresultater(hent(url))
    if not side.spil:
        return 422, fejl(INGEN_SPIL)
    turnering = {'navn': side.turnering['navn'], 'titel': side.turnering.get('titel', ''), 'dato': side.turnering['dato'],
                 'form': 'hold', 'skala': 'imp', 'top': None, 'id': q.get('tournament'), 'sektion': q.get('section'),
                 'runde': q.get('round'), 'halvleg': q.get('half')}
    valg = holdliste(side)
    if hold_id is None:
        return 200, {'turnering': turnering, 'vaelg': {'hold': valg}}
    valgt = next((v for v in valg if v['id'] == hold_id), None)
    if valgt is None:
        return 400, fejl(UKENDT_HOLD)

    beregnet = _dd_og_par(side.spil, turnering, cache)
    spil_ud = []
    for spil, (dd, par) in zip(side.spil, beregnet):
        egen = next((r for r in spil.resultater if r.bord == valgt['bord']), None)
        s = 1 if valgt['retning'] == 'NS' else -1
        holdet, modstander = (egen.ns_navn, egen.ov_navn) if (egen and s == 1) else ((egen.ov_navn, egen.ns_navn) if egen else ('', ''))
        # Holdkammeraterne sidder i den anden retning mod samme hold ved et andet bord.
        kammerater = next((r for r in spil.resultater if r is not egen and
                           ((s == 1 and r.ov_navn == holdet and r.ns_navn == modstander) or
                            (s == -1 and r.ns_navn == holdet and r.ov_navn == modstander))), None)
        felt = [s * r.score_ns for r in spil.resultater if r is not egen and r.spillet]
        if egen and egen.spillet and kammerater and kammerater.spillet:
            T = -s * kammerater.score_ns  # holdets score ved holdkammeraternes bord, set fra holdet
            spil_ud.append(_spil(spil, dd, par, egen, valgt['retning'], lambda S, T=T: regn.imp(S + T), 0, None,
                                 felt, T, turnering, cache))
        else:
            spil_ud.append(_ikke_spillet(spil, dd, par, valgt['retning']))
    deltager = {'type': 'hold', 'id': valgt['id'], 'retning': valgt['retning'], 'bord': valgt['bord']}
    return 200, _aftenen(turnering, deltager, spil_ud)


# Parturnering

def _parturnering(url, q, hent, cache):
    regnskab = laes.laes_personligt_regnskab(hent(url))
    if not regnskab.spil or 'pairno' not in q:
        return 422, fejl(INGEN_SPIL)
    parnr = int(q['pairno'])
    mappe = url.split('?', 1)[0].rsplit('/', 1)[0] + '/'
    fælles = '?' + '&'.join(f'{k}={urllib.parse.quote(q.get(k, ""), safe="/")}' for k in ('filename', 'tournament', 'section'))
    kort = laes.laes_kortfordeling(hent(mappe + 'kortfordeling.php' + fælles))
    resultater = laes.laes_spilresultater(hent(mappe + 'spilresultater.php' + fælles))

    alle = []
    for nummer in sorted(regnskab.spil):
        if nummer not in kort:
            continue
        giver, zone, haender = kort[nummer]
        dd_side, felt_raekker = resultater.get(nummer, (None, []))
        spil = laes.Spil(nummer, giver, zone, haender, dd_side, felt_raekker)
        alle.append((spil, regnskab.spil[nummer]))
    if not alle:
        return 422, fejl(INGEN_SPIL)
    turnering = {'navn': regnskab.turnering['navn'], 'titel': None, 'dato': regnskab.turnering['dato'], 'form': 'par',
                 'skala': 'matchpoint', 'top': None, 'id': q.get('tournament'), 'sektion': q.get('section'),
                 'runde': None, 'halvleg': None}

    beregnet = _dd_og_par([s for s, _ in alle], turnering, cache)
    spil_ud = []
    for (spil, egen), (dd, par) in zip(alle, beregnet):
        retning = egen.retning or 'NS'
        s = 1 if retning == 'NS' else -1
        felt = [s * r.score_ns for r in spil.resultater if parnr not in (r.ns_nr, r.ov_nr) and r.spillet]
        if egen.spillet and felt:
            spil_ud.append(_spil(spil, dd, par, egen, retning, lambda S, felt=felt: regn.matchpoint(S, felt),
                                 len(felt), 2 * len(felt), felt, None, turnering, cache))
        else:
            spil_ud.append(_ikke_spillet(spil, dd, par, retning))
    turnering['top'] = max((x['top'] for x in spil_ud if x['top']), default=None)
    return 200, _aftenen(turnering, {'type': 'par', 'nummer': parnr}, spil_ud)


# Fælles

def _noegle(turnering, spil, *mere):
    deal = hashlib.sha1(spil.pbn().encode()).hexdigest()[:12]
    return '/'.join(str(x) for x in (turnering.get('id'), turnering.get('sektion'), spil.nummer, deal) + mere)


def _dd_og_par(alle_spil, turnering, cache):
    """[(DD-tabel, par)] for spillene; fra cachen, hvor de findes, og ellers i ét DDS-kald."""
    ud = [cache.get(_noegle(turnering, s, 'dd')) if cache else None for s in alle_spil]
    mangler = [i for i, x in enumerate(ud) if x is None]
    beregnet = regn.dd_og_par([(alle_spil[i].pbn(), alle_spil[i].zone, alle_spil[i].giver) for i in mangler]) if mangler else []
    for i, (dd, par) in zip(mangler, beregnet):
        ud[i] = {'dd': dd, 'par': par}
        if cache:
            cache.set(_noegle(turnering, alle_spil[i], 'dd'), ud[i])
    return [(x['dd'], x['par']) for x in ud]


def _dd_efter(spil, k, udspil, turnering, cache):
    noegle = _noegle(turnering, spil, k.tekst() + k.spilfoerer, udspil or '-')
    gemt = cache.get(noegle) if cache else None
    if gemt is not None:
        return gemt['ddEfter']
    efter = regn.dd_efter_udspil(spil.pbn(), k.spilfoerer, k.farve, udspil) if udspil else None
    if cache:
        cache.set(noegle, {'ddEfter': efter})
    return efter


def _grund(spil, dd, par, retning):
    s = 1 if retning == 'NS' else -1
    return {
        'nummer': spil.nummer, 'giver': spil.giver, 'zone': spil.zone, 'haender': spil.haender,
        'ddTabel': dd, 'ddSide': spil.dd_side, 'ddAfvigelse': spil.dd_side is not None and dd != spil.dd_side,
        'par': {'scoreNS': par['score'], 'score': s * par['score'], 'kontrakter': par['kontrakter']},
        'retning': retning,
    }


def _ikke_spillet(spil, dd, par, retning):
    x = _grund(spil, dd, par, retning)
    x.update({'spillet': False, 'kontrakt': None, 'spilfoerer': None, 'udspil': None, 'stik': None, 'score': None,
              'point': None, 'top': None, 'procent': None, 'felt': [], 'holdkammerater': None, 'ddFoer': None,
              'ddEfter': None, 'scorer': None, 'faktorer': None, 'modpartensFejl': None, 'udspilseffekt': None,
              'maerker': []})
    return x


def _spil(spil, dd, par, egen, retning, P, middel, top, felt, holdkammerater, turnering, cache):
    s = 1 if retning == 'NS' else -1
    k = egen.kontrakt
    S_faktisk = s * egen.score_ns
    S_par = s * par['score']
    if k.pas:
        foer = efter = None
        S_ddFoer = S_ddEfter = 0
        parret_spilfoerer = None
    else:
        parret_spilfoerer = (k.spilfoerer in 'NS') == (retning == 'NS')
        fortegn = 1 if parret_spilfoerer else -1
        zonen = regn.i_zonen(spil.zone, k.spilfoerer)
        foer = dd[k.spilfoerer][k.farve]
        efter = _dd_efter(spil, k, egen.udspil, turnering, cache)
        S_ddFoer = fortegn * regn.score(k.niveau, k.farve, k.doblet, foer, zonen)
        S_ddEfter = fortegn * regn.score(k.niveau, k.farve, k.doblet, efter if efter is not None else foer, zonen)
    pf, pe, pb, pp = P(S_faktisk), P(S_ddEfter), P(S_ddFoer), P(S_par)
    udspil = pe - pb  # udspillets effekt set fra parret
    faktorer = {'meldinger': pb - pp, 'spilfoering': 0, 'modspil': 0, 'held': pp - middel}
    # Spilføring og modspil er højst 0: den positive del, hvor modparten spillede eller spillede modspil dårligere end
    # med åbne kort, er modpartens fejl og hører under held og uheld (SPEC-postmortem-1c-app.md, Afklaret).
    spillet = pf - pe
    modpartens_fejl = max(0, spillet) if parret_spilfoerer is not None else 0
    if parret_spilfoerer:
        faktorer['spilfoering'] = min(0, spillet)
        faktorer['held'] += udspil + modpartens_fejl   # modpartens udspil og fejl hører under held og uheld
    elif parret_spilfoerer is False:
        faktorer['modspil'] = min(0, spillet) + udspil
        faktorer['held'] += modpartens_fejl
    x = _grund(spil, dd, par, retning)
    x.update({
        'spillet': True, 'kontrakt': k.tekst(), 'spilfoerer': k.spilfoerer or None, 'udspil': egen.udspil,
        'stik': egen.stik, 'score': S_faktisk, 'point': pf, 'top': top,
        'procent': round(100 * pf / top, 1) if top else None, 'felt': sorted(felt, reverse=True),
        'holdkammerater': holdkammerater, 'ddFoer': foer, 'ddEfter': efter,
        'scorer': {'faktisk': S_faktisk, 'ddEfter': S_ddEfter, 'ddFoer': S_ddFoer, 'par': S_par},
        'faktorer': faktorer, 'modpartensFejl': modpartens_fejl,
        'udspilseffekt': None if k.pas else {'point': udspil, 'udspilAf': 'modparten' if parret_spilfoerer else 'parret',
                                             'ukendt': efter is None},
        'maerker': [],
    })
    return x


def _aftenen(turnering, deltager, spil):
    spillede = [x for x in spil if x['spillet']]
    faktorer = {f: sum(x['faktorer'][f] for x in spillede) for f in FAKTORER}
    point = sum(x['point'] for x in spillede)
    if turnering['form'] == 'par':
        top = sum(x['top'] for x in spillede)
        resultat = {'procent': round(100 * point / top, 2) if top else None, 'point': point, 'top': top, 'imp': None}
    else:
        resultat = {'procent': None, 'point': None, 'top': None, 'imp': point}
    kandidater = {f: faktorer[f] for f in ('meldinger', 'spilfoering', 'modspil') if faktorer[f] < 0}
    return {
        'turnering': turnering, 'deltager': deltager, 'resultat': resultat, 'faktorer': faktorer,
        'stoersteForbedring': min(kandidater, key=kandidater.get) if kandidater else None,
        'spil': spil,
    }
