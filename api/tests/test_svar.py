"""Svaret har præcis de felter, SVAR.md beskriver (trin 5)."""
import re

import pytest

from conftest import API, HOLD_URL, PAR_URL
from postmortem.analyse import analyser


def felter():
    """{'svar': {...}, 'svar.spil[]': {...}, ...} fra tabellerne i SVAR.md."""
    tekst = (API / 'SVAR.md').read_text(encoding='utf-8')
    ud = {}
    for afsnit in re.split(r'^### ', tekst, flags=re.M)[1:]:
        navn = afsnit.split('\n', 1)[0].strip()
        ud[navn] = set(re.findall(r'^\| `([A-Za-z]+)` \|', afsnit, re.M))
    return ud


def tjek(objekt, navn, doc, kun_delmaengde=False):
    noegler = set(objekt)
    if kun_delmaengde:
        assert noegler <= doc[navn], (navn, noegler - doc[navn])
    else:
        assert noegler == doc[navn], (navn, noegler ^ doc[navn])


@pytest.mark.parametrize('krop', [{'url': PAR_URL}, {'url': HOLD_URL, 'hold': '2-NS'}, {'url': HOLD_URL, 'hold': '4-NS'}])
def test_analysen_har_felterne_fra_svar_md(gemte_sider, krop):
    doc = felter()
    status, svar = analyser(krop, hent=gemte_sider)
    assert status == 200
    tjek(svar, 'svar', doc)
    tjek(svar['turnering'], 'svar.turnering', doc)
    tjek(svar['deltager'], 'svar.deltager', doc, kun_delmaengde=True)
    tjek(svar['resultat'], 'svar.resultat', doc)
    tjek(svar['faktorer'], 'svar.faktorer', doc)
    for spil in svar['spil']:
        tjek(spil, 'svar.spil[]', doc)
        tjek(spil['par'], 'svar.spil[].par', doc)
        assert spil['maerker'] == []
        if spil['spillet']:
            tjek(spil['scorer'], 'svar.spil[].scorer', doc)
            tjek(spil['faktorer'], 'svar.spil[].faktorer', doc)
            tjek(spil['udspilseffekt'], 'svar.spil[].udspilseffekt', doc)


def test_holdlisten_har_felterne_fra_svar_md(gemte_sider):
    doc = felter()
    status, svar = analyser({'url': HOLD_URL}, hent=gemte_sider)
    assert status == 200
    tjek(svar, 'vaelg-svar', doc)
    for valg in svar['vaelg']['hold']:
        tjek(valg, 'vaelg.hold[]', doc)
