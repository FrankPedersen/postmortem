"""Mærkerne skvis og indspil, nøglebeslutningerne og udspillet for ét spil (SPEC-postmortem-1b-maerker.md).

En teknik er nødvendig, når stiktallet falder uden den. Fra stillingen `P` på den bedste linje, når der er `N` stik
tilbage, regner slutstillingsløseren to tænkte spil:

- uden afkasttvang (modspillerne må passe, når de ikke kan bekende): falder tallet, er en skvis nødvendig;
- uden udspilstvang (modspillerne må give udspillet fra sig): falder tallet, er et indspil nødvendigt.

`analyser` giver felterne `maerker`, `teknik`, `raad` og `linje`, som de står i svaret (SVAR.md). Ingen navne.
"""
import copy
import time

from . import slutloeser
from .linje import PLADSER, Linje, rang, skriv_haender
from .slutloeser import TidenUde

N = 6               # teknikker findes i de sidste N stik
FRIST = 10.0        # sekunder pr. spil; derover beregnet: false med grunden "tid"
HOEJST = 3          # nøglebeslutninger pr. side

HUSK_HOEJST = 2000  # så mange analyser husker processen, før den begynder forfra
_HUSKET = {}        # færdige analyser i denne proces
TIDER = {}          # sekunder pr. analyse, der blev regnet (til målingen af ydeevnen)

TILVALG = {'skvis': 'pas_ved_afkast', 'indspil': 'giv_udspil'}


def glem():
    """Glemmer de analyser, processen husker (til testene af ydeevnen og af, at linjen er den samme hver gang)."""
    _HUSKET.clear()
    TIDER.clear()


def ikke_beregnet(grund):
    return {
        'maerker': [],
        'teknik': {'beregnet': False, 'grund': grund, 'udspilAntaget': None, 'stikFoerP': None, 'skvis': None,
                   'indspil': None, 'kastIndSkvis': False},
        'raad': None,
        'linje': None,
    }


def analyser(haender, trumf, spilfoerer, udspil=None, udspiller=None, frist=FRIST):
    """Analysen af ét spil i én kontrakt.

    haender: {'N': 'Q43.AJ43.AT83.A6', ...}; trumf: 'NT', 'S', 'H', 'D' eller 'C'; udspil: det faktiske udspil ('D7')
    eller None. Et helt spil spilles ud af spilførers venstre hånd; står udspillet forkert (ikke på udspillerens
    hånd), bruges modspillets bedste udspil, og svaret siger `udspilAntaget`. En slutstilling (færre end 13 kort)
    har intet udspil: `udspiller` er den, der er inde.
    """
    noegle = (tuple(haender[p] for p in PLADSER), trumf, spilfoerer, udspil, udspiller)
    if noegle not in _HUSKET:
        start = time.perf_counter()
        try:
            svar = _analyser(haender, trumf, spilfoerer, udspil, udspiller, start + frist)
        except TidenUde:
            return ikke_beregnet('tid')
        if len(_HUSKET) >= HUSK_HOEJST:
            glem()
        TIDER[noegle] = time.perf_counter() - start
        _HUSKET[noegle] = svar
    return copy.deepcopy(_HUSKET[noegle])


def _analyser(haender, trumf, spilfoerer, udspil, udspiller, frist):
    if time.perf_counter() >= frist:
        raise TidenUde()
    helt_spil = udspiller is None
    if helt_spil:
        udspiller = PLADSER[(PLADSER.index(spilfoerer) + 1) % 4]
    linje = Linje(haender, trumf, spilfoerer, udspiller, frist)
    modspillere = [p for p in PLADSER if not linje.er_spilfoerer(p)]

    # Udspillet: DD-tallet for hvert muligt udspil (ét DDS-kald)
    udspilsraad, antaget = None, False
    if helt_spil:
        v = linje.vaerdier()
        bedst = min(v.values())
        bedste = [g for g in linje.muligheder(udspiller) if v[g[0]] == bedst]
        if udspil in v:
            udspilsraad = {'faktisk': udspil, 'pris': v[udspil] - bedst, 'bedste': bedste}
            linje.spil_kort(udspil, v, givet=True)
        else:
            antaget = True
            udspilsraad = {'faktisk': None, 'pris': None, 'bedste': bedste}
            linje.spil_kort(linje.vaelg([k for g in bedste for k in g]), v, givet=True)

    # Linjen frem til P og DD-tallet (spilførersidens stik i alt; linjen holder det hele vejen)
    linje.spil_til(N)
    stik_foer_p = len(linje.stik)
    v = linje.vaerdier()
    i_alt = max(v.values()) if linje.er_spilfoerer(linje.i_tur) else min(v.values())
    p = {'haender': skriv_haender(linje.haender), 'udspiller': linje.udspiller, 'vundet': linje.vundet}
    V = i_alt - p['vundet']

    def rest():
        tilbage = frist - time.perf_counter()
        if tilbage <= 0:
            raise TidenUde()
        return tilbage

    # Mærkerne: falder tallet fra P i de to tænkte spil?
    stilling = slutloeser.Stilling(p['haender'], trumf, p['udspiller'], spilfoerer)
    fund = {}
    for navn, tilvalg in TILVALG.items():
        if stilling.mindst(V, frist=rest(), **{tilvalg: modspillere}):
            continue
        uden = stilling.stik(frist=rest(), hoejst=V - 1, **{tilvalg: modspillere})
        hver = [m for m in modspillere if not stilling.mindst(V, frist=rest(), **{tilvalg: [m]})]
        mod = hver[0] if len(hver) == 1 else 'begge' if len(hver) == 2 else 'en af dem'
        fund[navn] = {'mod': mod, 'saet': hver if len(hver) == 1 else modspillere, 'tilvalg': tilvalg,
                      'uden': p['vundet'] + uden}

    # Resten af linjen. Modspillerne holder igen, så længe de kan: blandt de kort, der holder DD-tallet, vælger de
    # et, hvorefter teknikken stadig er nødvendig (ellers udløses en skvis før tid, eller indspillet forsvinder).
    def foretraek(l, holder, maal):
        bedst, valgt = 0, None
        for gruppe in l.grupper(l.i_tur):
            if gruppe[0] not in holder:
                continue
            efter = {q: [k for k in l.haender[q] if k != gruppe[0]] for q in PLADSER}
            st = slutloeser.Stilling(skriv_haender(efter), trumf, l.udspiller, spilfoerer,
                                     igang=[k for _, k in l.igang] + [gruppe[0]])
            behov = maal - l.vundet
            noedvendige = sum(1 for f in fund.values()
                              if not st.mindst(behov, frist=rest(), **{f['tilvalg']: f['saet']}))
            if noedvendige > bedst:
                bedst, valgt = noedvendige, list(gruppe)
            elif noedvendige == bedst and valgt is not None:
                valgt += gruppe
        return valgt

    linje.spil_til(0, foretraek if fund else None)

    def falder(q, f):
        st = slutloeser.Stilling(skriv_haender(q['haender']), trumf, q['udspiller'], spilfoerer)
        return not st.mindst(i_alt - q['vundet'], frist=rest(), **{f['tilvalg']: f['saet']})

    skvis = indspil = None
    if 'skvis' in fund:
        f = fund['skvis']
        skvis = {'mod': f['mod'], 'stik': None, 'kort': None, 'farver': [], 'medTeknik': i_alt, 'udenTeknik': f['uden']}
        # Skvisstikket: det sidste stik efter P, hvor den skviste modspiller ikke kan bekende, og hvor tallet stadig
        # falder, hvis han må passe fra det stik og frem.
        for t in range(stik_foer_p, len(linje.stik)):
            q, stik = linje.stillinger[t], linje.stik[t]
            farve = stik['kort'][0][0]
            kan_ikke = [m for m in f['saet'] if m != stik['udspiller'] and not any(k[0] == farve for k in q['haender'][m])]
            if kan_ikke and falder(q, f):
                holdt = {k[0] for m in kan_ikke for k in q['haender'][m]}
                skvis.update(stik=t + 1, kort=stik['kort'][0], farver=[x for x in 'SHDC' if x in holdt])
    if 'indspil' in fund:
        f = fund['indspil']
        indspil = {'mod': f['mod'], 'stik': None, 'kort': None, 'medTeknik': i_alt, 'udenTeknik': f['uden']}

        def indspilskort(stik):
            """Det første kort, spilførersiden lagde i stikket."""
            start = PLADSER.index(stik['udspiller'])
            return next(k for n, k in enumerate(stik['kort']) if linje.er_spilfoerer(PLADSER[(start + n) % 4]))

        # Indspilsstikket: det sidste stik efter P, som modspilleren vinder (uden selv at have spillet ud) og derefter
        # skal spille ud fra, og hvor tallet stadig falder, hvis han må give udspillet fra sig fra det stik og frem.
        for t in range(stik_foer_p, len(linje.stik) - 1):
            stik = linje.stik[t]
            if stik['vinder'] in f['saet'] and stik['udspiller'] != stik['vinder'] and falder(linje.stillinger[t], f):
                indspil.update(stik=t + 1, kort=indspilskort(stik))
        # Er modspilleren allerede inde ved P, er han sat ind i stikket lige før.
        if indspil['stik'] is None and stik_foer_p and p['udspiller'] in f['saet']:
            foer = linje.stik[stik_foer_p - 1]
            if foer['udspiller'] != foer['vinder']:
                indspil.update(stik=stik_foer_p, kort=indspilskort(foer))

    kast_ind_skvis = bool(skvis and indspil and skvis['mod'] == indspil['mod'] and skvis['mod'] in PLADSER
                          and skvis['stik'] is not None and indspil['stik'] is not None
                          and skvis['stik'] < indspil['stik'])
    raad = _noeglebeslutninger(linje, trumf, stik_foer_p, skvis, indspil)
    raad['udspil'] = udspilsraad
    return {
        'maerker': [m for m, x in (('skvis', skvis), ('indspil', indspil)) if x],
        'teknik': {'beregnet': True, 'grund': None, 'udspilAntaget': antaget, 'stikFoerP': stik_foer_p,
                   'skvis': skvis, 'indspil': indspil, 'kastIndSkvis': kast_ind_skvis},
        'raad': raad,
        'linje': linje.stik,
    }


# Nøglebeslutninger

def _slaar(kort, bedste, trumf):
    if kort[0] == bedste[0]:
        return rang(kort) > rang(bedste)
    return kort[0] == trumf


def _har_stikket(igang, trumf):
    bedst = igang[0]
    for plads, kort in igang[1:]:
        if _slaar(kort, bedst[1], trumf):
            bedst = (plads, kort)
    return bedst


def _triviel(tr, trumf, spilfoerer_side):
    """Den eneste rigtige mulighed er at bekende med det eneste kort, der vinder stikket, eller at trumfe et stik,
    der ellers tabes."""
    if not tr['igang']:
        return False
    plads, bedst = _har_stikket(tr['igang'], trumf)
    if (plads in spilfoerer_side) == (tr['haand'] in spilfoerer_side):
        return False        # makker har stikket
    kort = tr['kort']
    if not _slaar(kort, bedst, trumf):
        return False
    if kort[0] == tr['igang'][0][1][0]:
        return not any(_slaar(g[0], bedst, trumf) for g in tr['muligheder'] if kort not in g)
    return True             # trumfning af et stik, modparten har


def _topvinder(tr, kort, trumf, side):
    """Vinder kortet stikket som udspil, uanset hvad modparten lægger? (Farvens højeste kort hos modparten er
    lavere, og ingen af dem kan trumfe.)"""
    for m in PLADSER:
        if (m in side) == (tr['haand'] in side):
            continue
        i_farven = [k for k in tr['haender'][m] if k[0] == kort[0]]
        if i_farven:
            if any(rang(k) > rang(kort) for k in i_farven):
                return False
        elif trumf not in ('NT', kort[0]) and any(k[0] == trumf for k in tr['haender'][m]):
            return False
    return True


def _dyk(tr, muligheder, holder, trumf, side):
    """Valget mellem at vinde stikket og at dykke (frafald og hold-up): modparten har stikket, spilleren bekender og
    kan stikke over, og kun det at lade være holder DD-tallet. Det tæller, uanset hvor mange små kort hånden har."""
    if not tr['igang'] or tr['kort'][0] != tr['igang'][0][1][0]:
        return False
    plads, bedst = _har_stikket(tr['igang'], trumf)
    if (plads in side) == (tr['haand'] in side):
        return False        # makker har stikket
    vinder = [g for g in muligheder if _slaar(g[0], bedst, trumf)]
    dykker = [g for g in muligheder if not _slaar(g[0], bedst, trumf)]
    return bool(vinder and dykker) and not any(g in holder for g in vinder) and any(g in holder for g in dykker)


def _noeglebeslutninger(linje, trumf, stik_foer_p, skvis, indspil):
    """Et kort på linjen er en nøglebeslutning, når spilleren har mindst tre muligheder (kort på samme hånd regnes som
    ét, når intet kort uden for hånden ligger imellem dem), kun én holder DD-tallet, og den ikke er triviel. Med
    præcis to muligheder kun, når kortet hører til et mærke. Dertil (Franks ændringer 14. november 2026):

    - et dyk tæller altid, når kun det holder DD-tallet (`_dyk`), også med to muligheder eller flere små kort;
    - i udspil tæller et kort kun, når det ikke er en topvinder, eller når mindst ét andet kort også vinder stikket.
    """
    side = linje.side
    vindere = {n + 1: s['vinder'] for n, s in enumerate(linje.stik)}

    def maerke(tr):
        if tr['haand'] not in side:
            return None
        if skvis and skvis['stik'] is not None:
            if tr['stik'] == skvis['stik'] and not tr['igang']:
                return 'skvis'      # skviskortet
            if stik_foer_p < tr['stik'] < skvis['stik'] and vindere[tr['stik']] not in side:
                return 'skvis'      # tællingen rettes ved at afgive et stik
        if indspil and tr['stik'] == indspil['stik'] and tr['kort'] == indspil['kort']:
            return 'indspil'       # indspilskortet
        return None

    ud = {'spilfoering': [], 'modspil': []}
    for tr in linje.traek:
        if tr['givet']:
            continue
        v, muligheder = tr['vaerdier'], tr['muligheder']
        spilfoerer = tr['haand'] in side
        tal = [v[g[0]] for g in muligheder]
        bedst = max(tal) if spilfoerer else min(tal)
        holder = [g for g, x in zip(muligheder, tal) if x == bedst]
        if len(holder) == len(muligheder):
            continue
        m = maerke(tr)
        if _dyk(tr, muligheder, holder, trumf, side):
            pass
        elif len(holder) != 1:
            continue
        elif len(muligheder) == 2:
            if m is None:
                continue
        elif _triviel(tr, trumf, side):
            continue
        if not tr['igang'] and _topvinder(tr, tr['kort'], trumf, side) and not any(
                _topvinder(tr, g[-1], trumf, side) for g in muligheder if tr['kort'] not in g):
            continue        # en topvinder i udspil, og intet andet kort vinder stikket
        andre = sorted(((g, x) for g, x in zip(muligheder, tal) if x != bedst),
                       key=lambda gx: gx[1] if spilfoerer else -gx[1])    # de dyreste først
        ud['spilfoering' if spilfoerer else 'modspil'].append({
            'stik': tr['stik'], 'haand': tr['haand'], 'kort': tr['kort'], 'dd': bedst, 'maerke': m,
            'alternativer': [{'kort': g, 'dd': x} for g, x in andre[:2]],
        })
    for liste in ud.values():
        liste.sort(key=lambda n: (n['maerke'] is None, n['stik']))
        del liste[HOEJST:]
    return ud
