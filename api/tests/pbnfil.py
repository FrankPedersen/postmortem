"""Læser testsættene i tests/data/*.pbn: en liste af {felt: værdi} pr. stilling eller spil."""
import re

from conftest import DATA


def laes(navn):
    ud, nu = [], None
    for linje in (DATA / navn).read_text(encoding='utf-8').splitlines():
        m = re.fullmatch(r'\[(\w+) "(.*)"\]', linje.strip())
        if not m:
            continue
        if m.group(1) in ('Stilling', 'Event') or (m.group(1) == 'Board' and (nu is None or 'Deal' in nu)):
            nu = {}
            ud.append(nu)
        nu[m.group(1)] = m.group(2)
    return ud


def felter(tekst):
    """'mod=W stik=1 kort=CA' -> {'mod': 'W', 'stik': '1', 'kort': 'CA'}; 'mod=en af dem' må have mellemrum."""
    return {k: v.strip() for k, v in re.findall(r'(\w+)=(.*?)(?=\s+\w+=|$)', tekst or '')}


def haender(deal):
    """'N:AJ.K.. ..987. 4.2..A KQ.A..' -> {'N': 'AJ.K..', 'E': '..987.', 'S': '4.2..A', 'W': 'KQ.A..'}"""
    foerste, resten = deal.split(':')
    pladser = 'NESW'
    i = pladser.index(foerste)
    return {pladser[(i + n) % 4]: h for n, h in enumerate(resten.split())}


SLUTSTILLINGER = laes('slutstillinger.pbn')
HELE_SPIL = laes('helespil.pbn')
TESTSPIL = laes('testspil.pbn')
