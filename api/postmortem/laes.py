"""Læsning af siderne fra resultater.bridge.dk (trin 3).

Siderne er HTML fra samme skabelon. Hvert spil står i en blok, der begynder med `<div class="boardNo">`, og hvert bords
resultat i en `<li class="table">` efter spillets diagram. Navne læses kun til holdlisten og forlader aldrig modulet i
analysen; resten af funktionen arbejder med bordnumre, parnumre og retninger.
"""
import html
import re
import urllib.parse
from dataclasses import dataclass, field

DANSKE_SPILLERE = {'N': 'N', 'Ø': 'E', 'S': 'S', 'V': 'W'}
DANSKE_GIVERE = {'Nord': 'N', 'Øst': 'E', 'Syd': 'S', 'Vest': 'W'}
DANSKE_ZONER = {'-': 'None', 'NS': 'NS', 'ØV': 'EW', 'Alle': 'All'}
FARVETEGN = {'♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C'}
DENOM = {'♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C', 'UT': 'NT', 'NT': 'NT'}
RANG = {'A': 'A', 'E': 'A', 'K': 'K', 'Q': 'Q', 'D': 'Q', 'J': 'J', 'B': 'J', 'T': 'T', '10': 'T'}


@dataclass
class Kontrakt:
    """En kontrakt ved et bord. `pas` er sand, når alle fire passede."""
    niveau: int = 0
    farve: str = ''        # 'C', 'D', 'H', 'S' eller 'NT'
    doblet: int = 0        # 0, 1 (doblet) eller 2 (redoblet)
    spilfoerer: str = ''   # 'N', 'E', 'S' eller 'W'
    pas: bool = False

    def tekst(self):
        if self.pas:
            return 'Pas'
        return f"{self.niveau}{self.farve}{'X' * self.doblet}"


@dataclass
class Resultat:
    """Ét bords resultat på et spil. `ns_navn` og `ov_navn` bruges kun til holdlisten."""
    bord: int | None = None
    ns_nr: int | None = None
    ov_nr: int | None = None
    ns_navn: str = ''
    ov_navn: str = ''
    kontrakt: Kontrakt | None = None
    udspil: str | None = None   # fx 'D7' (farve og rang med engelske bogstaver)
    stik: int | None = None
    score_ns: int | None = None
    retning: str | None = None  # parrets retning i personligt regnskab: 'NS' eller 'OV'

    @property
    def spillet(self):
        return self.kontrakt is not None and self.score_ns is not None


@dataclass
class Spil:
    nummer: int
    giver: str = ''
    zone: str = 'None'
    haender: dict = field(default_factory=dict)   # {'N': 'Q43.AJ43.AT83.A6', ...} (♠.♥.♦.♣)
    dd_side: dict | None = None                    # sidens DD-tabel {'N': {'C': 8, ...}, ...}
    resultater: list = field(default_factory=list)

    def pbn(self):
        return 'N:' + ' '.join(self.haender[s] for s in 'NESW')


@dataclass
class Side:
    turnering: dict
    spil: list


def tekst(stykke):
    """HTML til ren tekst med enkelte mellemrum."""
    stykke = re.sub(r'<script.*?</script>', ' ', stykke, flags=re.S)
    return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', stykke)).replace('\xa0', ' ').split())


def heltal(stykke):
    t = tekst(stykke).replace(',', '.')
    try:
        return int(float(t)) if t and float(t) == int(float(t)) else None
    except ValueError:
        return None


def celler(stykke, klasse):
    """Indholdet af alle <div class="... klasse ...">…</div> i rækkefølge (uden indlejrede div'er)."""
    return re.findall(rf'<div[^>]*class="[^"]*\b{klasse}\b[^"]*"[^>]*>(.*?)</div>', stykke, re.S)


def laes_kontrakt(t):
    t = t.strip()
    if not t:
        return None
    if re.fullmatch(r'(?i)(alle\s+)?pas(s)?(\s+rundt)?', t):
        return Kontrakt(pas=True)
    m = re.fullmatch(r'([NSØV])\s*([1-7])\s*(UT|NT|♠|♥|♦|♣)\s*(RD|R|XX|D|X)?', t)
    if not m:
        return None
    doblet = {None: 0, 'D': 1, 'X': 1, 'RD': 2, 'R': 2, 'XX': 2}[m.group(4)]
    return Kontrakt(int(m.group(2)), DENOM[m.group(3)], doblet, DANSKE_SPILLERE[m.group(1)])


def laes_udspil(t):
    m = re.fullmatch(r'([♠♥♦♣])\s*(10|[2-9TJQKAEDB])', t.strip())
    if not m:
        return None
    rang = RANG.get(m.group(2), m.group(2))
    return FARVETEGN[m.group(1)] + rang


def blokke(side):
    """{spilnummer: html for spillet og bordenes resultater}"""
    fund = list(re.finditer(r'<div class="boardNo">\s*(\d+)\s*</div>', side))
    return {int(m.group(1)): side[m.start():(fund[i + 1].start() if i + 1 < len(fund) else len(side))]
            for i, m in enumerate(fund)}


def laes_diagram(blok):
    """Giver, zone og hænder fra diagrammet (danske bogstaver: E, K, D, B, T)."""
    giver = re.search(r'<span class="dealer">\s*([^<]+?)\s*</span>', blok)
    zone = re.search(r'<span class="vulnerability">\s*([^<]*?)\s*</span>', blok)
    haender = {}
    for plads, s in (('north', 'N'), ('east', 'E'), ('south', 'S'), ('west', 'W')):
        m = re.search(rf'class="seat {plads}\b(.*?)(?=class="seat |class="bottom-|<!--|class="uk-panel uk-panel-box datum|$)', blok, re.S)
        if not m:
            return None
        farver = []
        for f in ('spades', 'hearts', 'diamonds', 'clubs'):
            fm = re.search(rf'class="{f}">(.*?)</div>', m.group(1), re.S)
            kort = tekst(fm.group(1)) if fm else ''
            kort = re.sub(r'[♠♥♦♣\-—–]', '', kort).replace(' ', '')
            farver.append(''.join(RANG.get(k, k) for k in re.findall(r'10|.', kort)))
        haender[s] = '.'.join(farver)
    return (DANSKE_GIVERE.get(giver.group(1).strip(), '') if giver else '',
            DANSKE_ZONER.get(zone.group(1).strip(), 'None') if zone else 'None',
            haender)


def laes_solver_link(blok):
    """Hænder, giver og zone fra Bridge Solver-linket (engelske bogstaver)."""
    m = re.search(r'ddummy\.htm\?([^"\s]+)', blok)
    if not m:
        return None
    q = dict(urllib.parse.parse_qsl(html.unescape(m.group(1)), keep_blank_values=True))
    try:
        haender = {s: q[n] for s, n in (('N', 'north'), ('E', 'east'), ('S', 'south'), ('W', 'west'))}
    except KeyError:
        return None
    return q.get('dealer', ''), {'None': 'None', 'NS': 'NS', 'EW': 'EW', 'All': 'All', 'Both': 'All'}.get(q.get('vul', 'None'), 'None'), haender


def laes_dd_tabel(blok):
    """Sidens DD-tabel: kolonnerne NT ♠ ♥ ♦ ♣ (og hp), rækkerne N S Ø V.

    Bordresultaterne har den som <table>, spilresultaterne som div'er; begge læses fra teksten.
    """
    m = re.search(r'NT ♠ ♥ ♦ ♣(?: HP)?((?: [NSØV](?: \d+){5}(?: (?:hp:)?\d+)?){4})', tekst(blok))
    if not m:
        return None
    tabel = {}
    for plads, *tal in re.findall(r'([NSØV]) (\d+) (\d+) (\d+) (\d+) (\d+)', m.group(1)):
        tabel[DANSKE_SPILLERE[plads]] = dict(zip(('NT', 'S', 'H', 'D', 'C'), map(int, tal)))
    return tabel if len(tabel) == 4 else None


def score_ns(score):
    """Scorecellerne viser altid tallet set fra NS; kolonnen (NS eller ØV) siger kun, hvem der fik point."""
    for celle in score[:2]:
        tal = heltal(celle)
        if tal is not None:
            return tal
    return None


def laes_hoved(side):
    """Turneringens navn, titel, form og dato fra sidehovedet (ingen navne på personer)."""
    def felt(klasse):
        m = re.search(rf'<div class="{klasse}[^"]*">(.*?)</div>', side, re.S)
        return tekst(m.group(1)) if m else ''
    dato = re.search(r'Dato:\s*(\d{2})-(\d{2})-(\d{4})', side)
    return {'navn': felt('description'), 'form': felt('type'),
            'dato': f'{dato.group(3)}-{dato.group(2)}-{dato.group(1)}' if dato else None}


# Holdturnering: multihold_bordresultater.php

def laes_bordresultater(side):
    """Alle spil med diagram, DD-tabel og resultaterne ved alle borde."""
    hoved = laes_hoved(side)
    titel = re.search(r'<h1 class="title">(.*?)</h1>', side, re.S)
    hoved['titel'] = tekst(titel.group(1)) if titel else ''
    spil = []
    for nummer, blok in blokke(side).items():
        link = laes_solver_link(blok)
        diagram = link or laes_diagram(blok)
        if not diagram:
            continue
        s = Spil(nummer, diagram[0], diagram[1], diagram[2], laes_dd_tabel(blok))
        for raekke in blok.split('<li class="table">')[1:]:
            r = Resultat()
            bord = celler(raekke, 'teamNo')
            r.bord = heltal(bord[0]) if bord else None
            hold = [tekst(x) for x in re.findall(r'team-name[^"]*">\s*<strong>(.*?)</strong>', raekke, re.S)]
            if len(hold) == 2:
                r.ns_navn, r.ov_navn = hold
            kontrakt = celler(raekke, 'contract')
            stik = celler(raekke, 'tricks')
            score = celler(raekke, 'tableScore')
            r.kontrakt = laes_kontrakt(tekst(kontrakt[0])) if kontrakt else None
            if r.kontrakt and len(stik) >= 2:
                r.udspil = laes_udspil(tekst(stik[0]))
                r.stik = heltal(stik[1])
                r.score_ns = score_ns(score)
            s.resultater.append(r)
        spil.append(s)
    return Side(hoved, spil)


# Parturnering: personligt_regnskab.php, kortfordeling.php og spilresultater.php

def laes_personligt_regnskab(side):
    """Parrets egne resultater: {spilnummer: Resultat med retning}. Retningen står kun i rundens første række."""
    hoved = laes_hoved(side)
    egne = {}
    retning = None
    for raekke in side.split('<li class="table">')[1:]:
        kontrakt = celler(raekke, 'contract')
        if not kontrakt:
            continue
        nummer = re.search(r'#B(\d+)"', kontrakt[0])
        if not nummer:
            continue
        r = Resultat()
        if len(kontrakt) >= 2 and tekst(kontrakt[1]) in ('NS', 'ØV'):
            retning = 'NS' if tekst(kontrakt[1]) == 'NS' else 'OV'
        r.retning = retning
        r.kontrakt = laes_kontrakt(tekst(kontrakt[3])) if len(kontrakt) >= 4 else None
        stik = celler(raekke, 'tricks')
        score = celler(raekke, 'tableScore')
        if r.kontrakt and len(stik) >= 2:
            r.udspil = laes_udspil(tekst(stik[0]))
            r.stik = heltal(stik[1])
            r.score_ns = score_ns(score)
        egne[int(nummer.group(1))] = r
    return Side(hoved, egne)


def laes_kortfordeling(side):
    """{spilnummer: (giver, zone, hænder)}"""
    ud = {}
    for nummer, blok in blokke(side).items():
        diagram = laes_diagram(blok)
        if diagram:
            ud[nummer] = diagram
    return ud


def laes_spilresultater(side):
    """{spilnummer: (DD-tabel, [Resultat for hvert bord med parnumre])}"""
    ud = {}
    for nummer, blok in blokke(side).items():
        resultater = []
        for raekke in blok.split('<li class="table">')[1:]:
            r = Resultat()
            navne = celler(raekke, 'team-name')
            if len(navne) >= 4:
                r.ns_nr, r.ov_nr = heltal(navne[1]), heltal(navne[3])
            kontrakt = celler(raekke, 'contract')
            stik = celler(raekke, 'tricks')
            score = celler(raekke, 'tableScore')
            r.kontrakt = laes_kontrakt(tekst(kontrakt[0])) if kontrakt else None
            if r.kontrakt and len(stik) >= 2:
                r.udspil = laes_udspil(tekst(stik[0]))
                r.stik = heltal(stik[1])
                r.score_ns = score_ns(score)
            resultater.append(r)
        ud[nummer] = (laes_dd_tabel(blok), resultater)
    return ud
