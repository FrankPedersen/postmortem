"""Ingen rigtige navne i testdataene.

De rigtige sider fra resultater.bridge.dk ligger uden for repoet i `_lab/postmortem-0/bridgedk/` (Franks pc). Testen
læser navnene fra dem og tjekker, at ingen fil i tests/data/ eller i appens src/test/data/ (svarene, appens tests bruger,
SPEC-postmortem-1c-app.md) indeholder et af dem. Uden _lab springes den over.
"""
import pathlib

import pytest

import anonymiser
from conftest import API, DATA

LAB = API.parents[1] / '_lab' / 'postmortem-0' / 'bridgedk'
APP_DATA = API.parent / 'src' / 'test' / 'data'


@pytest.mark.skipif(not LAB.is_dir(), reason='de rigtige sider findes kun på Franks pc (_lab/postmortem-0/bridgedk/)')
def test_ingen_rigtige_navne_i_testdata():
    sider = {navn: (LAB / navn).read_bytes().decode('utf-8') for navn in anonymiser.SIDER}
    spillere, hold = anonymiser.navne(sider)
    assert len(spillere) == 37 and len(hold) == 8
    filer = [p for p in DATA.iterdir() if p.is_file()]
    assert len(filer) >= 6
    app_filer = sorted(p.name for p in APP_DATA.glob('*.json'))
    assert app_filer == ['hold-450-vaelg.json', 'hold-450.json', 'par-452.json']
    for fil in filer + sorted(APP_DATA.glob('*.json')):
        tekst = fil.read_bytes().decode('utf-8', errors='replace')
        assert not anonymiser.rester(tekst, spillere | hold), fil.name


@pytest.mark.skipif(not LAB.is_dir(), reason='de rigtige sider findes kun på Franks pc (_lab/postmortem-0/bridgedk/)')
def test_testdata_er_de_anonymiserede_sider(tmp_path):
    anonymiser.main(LAB, tmp_path)
    for navn in anonymiser.SIDER:
        assert (tmp_path / navn).read_bytes() == (DATA / navn).read_bytes(), navn
