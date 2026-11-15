"""Ingen rigtige navne i testdataene.

De rigtige sider fra resultater.bridge.dk ligger aldrig i repoet. Når testsider laves, hentes de rigtige sider til en
midlertidig mappe uden for repoet, og miljøvariablen POSTMORTEM_RIGTIGE_SIDER sættes til den mappe (CLAUDE.md). Testen
læser navnene fra siderne dér og tjekker, at ingen fil i tests/data/ eller i appens src/test/data/ (svarene, appens
tests bruger, SPEC-postmortem-1c-app.md) indeholder et af dem, og at tests/data/ er de anonymiserede sider. Uden
variablen springes den over; peger den på en mappe, der ikke findes, fejler testen.
"""
import os
import pathlib

import pytest

import anonymiser
from conftest import API, DATA

VARIABEL = 'POSTMORTEM_RIGTIGE_SIDER'
RIGTIGE_SIDER = pathlib.Path(os.environ[VARIABEL]) if os.environ.get(VARIABEL) else None
APP_DATA = API.parent / 'src' / 'test' / 'data'
uden_rigtige_sider = pytest.mark.skipif(
    RIGTIGE_SIDER is None, reason=f'{VARIABEL} er ikke sat; de rigtige sider ligger aldrig i repoet (CLAUDE.md)')


def mappen():
    assert RIGTIGE_SIDER.is_dir(), f'{VARIABEL} peger på {RIGTIGE_SIDER}, som ikke er en mappe'
    return RIGTIGE_SIDER


@uden_rigtige_sider
def test_ingen_rigtige_navne_i_testdata():
    rigtige = mappen()
    sider = {navn: (rigtige / navn).read_bytes().decode('utf-8') for navn in anonymiser.SIDER}
    spillere, hold = anonymiser.navne(sider)
    assert len(spillere) == 37 and len(hold) == 8
    filer = [p for p in DATA.iterdir() if p.is_file()]
    assert len(filer) >= 6
    app_filer = sorted(p.name for p in APP_DATA.glob('*.json'))
    assert app_filer == ['hold-450-vaelg.json', 'hold-450.json', 'par-452.json']
    for fil in filer + sorted(APP_DATA.glob('*.json')):
        tekst = fil.read_bytes().decode('utf-8', errors='replace')
        assert not anonymiser.rester(tekst, spillere | hold), fil.name


@uden_rigtige_sider
def test_testdata_er_de_anonymiserede_sider(tmp_path):
    anonymiser.main(mappen(), tmp_path)
    for navn in anonymiser.SIDER:
        assert (tmp_path / navn).read_bytes() == (DATA / navn).read_bytes(), navn
