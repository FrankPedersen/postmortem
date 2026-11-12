"""Anonymiserer de gemte sider fra resultater.bridge.dk til testene.

    python anonymiser.py <mappe med de rigtige sider> <mappe til de anonymiserede>

Alle spiller- og holdnavne bliver til faste pladsholdere ("Spiller 7", "Hold 3"); alt andet (spil, kontrakter, scorer,
Bridge Solver-links) er uændret. Samme navn får samme pladsholder på alle siderne, så holdkammeraterne stadig kan
findes. Nummereringen følger navnenes alfabetiske orden, så scriptet giver de samme filer hver gang. Scriptet fejler,
hvis et navn er tilbage bagefter. De rigtige sider må ikke komme i repoet; kun de anonymiserede ligger i tests/data/.
"""
import pathlib
import re
import sys

SIDER = ('bordresultater-450.html', 'scoresheet-450.html', 'personligt-regnskab-452.html',
         'kortfordeling-452.html', 'spilresultater-452.html')
BOGSTAV = r'[A-Za-zÆØÅæøåÉéÖöÜüÄä]'


def _par(felt):
    """'Fornavn Efternavn - Fornavn Efternavn' -> navnene (kun dem med mindst to ord)."""
    return {d.strip() for d in felt.split(' - ') if len(d.strip().split()) >= 2}


def navne(sider):
    """(spillere, hold) som mængder af navne fundet på siderne."""
    spillere, hold = set(), set()
    for tekst in sider.values():
        spillere.update(n.strip() for n in re.findall(r'<span class="player">([^<]+)</span>', tekst))
        hold.update(n.strip() for n in re.findall(r'<strong>([^<]+)</strong>', tekst))
        hold.update(n.strip() for n in re.findall(r'title="Hold: ([^"]+)"', tekst))
        for felt in re.findall(r'team-name[^>]*>\s*([^<]*?)\s*</div>', tekst):
            spillere.update(_par(felt))
        for felt in re.findall(r'info contract[^>]*>\s*([A-ZÆØÅ][^<]*? - [^<]*?)\s*</div>', tekst):
            spillere.update(_par(felt))
        for felt in re.findall(r'Personligt regnskab for par \d+:\s*([^<]+?)\s*<', tekst):
            spillere.update(_par(felt))
        # Scoresheetets rum: spillernes navne i centrerede celler.
        for felt in re.findall(r'uk-text-center">\s*([A-ZÆØÅ][^<0-9]*?)\s*</div>', tekst):
            if re.fullmatch(rf'{BOGSTAV}+\.?(?: {BOGSTAV}+\.?)+', felt) and felt not in ('Åbent rum', 'Lukket rum'):
                spillere.add(felt.strip())
    spillere = {n for n in spillere if len(n.split()) >= 2}
    hold = {n for n in hold if len(n.split()) >= 2}
    return spillere, hold


def pladsholdere(spillere, hold):
    """{navn: pladsholder} for spillere og {navn: pladsholder} for hold."""
    return ({n: f'Spiller {i}' for i, n in enumerate(sorted(spillere), 1)},
            {n: f'Hold {i}' for i, n in enumerate(sorted(hold), 1)})


def _ord(navn):
    return re.compile(rf'(?<!{BOGSTAV}){re.escape(navn)}(?!{BOGSTAV})')


def anonymiser(tekst, til_spiller, til_hold):
    # Holdnavnene først, i deres egne felter, så et hold med kaptajnens navn bliver "Hold n".
    tekst = re.sub(r'<strong>([^<]+)</strong>',
                   lambda m: f'<strong>{til_hold.get(m.group(1).strip(), m.group(1))}</strong>', tekst)
    tekst = re.sub(r'title="Hold: ([^"]+)"',
                   lambda m: f'title="Hold: {til_hold.get(m.group(1).strip(), m.group(1))}"', tekst)
    # Så alle spillernavne, hvor de end står, de længste først.
    for navn in sorted(til_spiller, key=len, reverse=True):
        tekst = _ord(navn).sub(til_spiller[navn], tekst)
    for navn in sorted(til_hold, key=len, reverse=True):
        tekst = _ord(navn).sub(til_hold[navn], tekst)
    return tekst


def rester(tekst, alle_navne):
    return sorted(n for n in alle_navne if _ord(n).search(tekst))


def main(kilde, maal):
    kilde, maal = pathlib.Path(kilde), pathlib.Path(maal)
    # Bytes ind og ud, så linjeskift og alt andet end navnene er uændret.
    sider = {navn: (kilde / navn).read_bytes().decode('utf-8') for navn in SIDER}
    spillere, hold = navne(sider)
    til_spiller, til_hold = pladsholdere(spillere, hold)
    maal.mkdir(parents=True, exist_ok=True)
    for navn, tekst in sider.items():
        ny = anonymiser(tekst, til_spiller, til_hold)
        tilbage = rester(ny, spillere | hold)
        if tilbage:
            raise SystemExit(f'{navn}: navne tilbage efter anonymiseringen: {len(tilbage)}')
        (maal / navn).write_bytes(ny.encode('utf-8'))
    print(f'{len(SIDER)} sider anonymiseret: {len(spillere)} spillere og {len(hold)} hold')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
