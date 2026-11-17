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
    # Vindue 1b (SPEC-postmortem-1b-maerker.md): aftenens teknikker
    tjek(svar['teknikker'], 'svar.teknikker', doc)
    for maerke in ('skvis', 'indspil'):
        tjek(svar['teknikker'][maerke], 'svar.teknikker.maerke', doc)
    tjek(svar['teknikker']['spilfoerer'], 'svar.teknikker.spilfoerer', doc)
    tjek(svar['vaerdAtSePaa'], 'svar.vaerdAtSePaa', doc)
    for spil in svar['spil']:
        tjek(spil, 'svar.spil[]', doc)
        tjek(spil['par'], 'svar.spil[].par', doc)
        assert set(spil['maerker']) <= {'skvis', 'indspil'}
        tjek(spil['teknik'], 'svar.spil[].teknik', doc)
        if spil['teknik']['skvis']:
            tjek(spil['teknik']['skvis'], 'svar.spil[].teknik.skvis', doc)
        if spil['teknik']['indspil']:
            tjek(spil['teknik']['indspil'], 'svar.spil[].teknik.indspil', doc)
        if spil['spillet']:
            # v2a (SPEC-postmortem-2a-vaerd-at-se-paa.md): meldesamtalen og mærkerne
            m = spil['meldesamtale']
            tjek(m, 'svar.spil[].meldesamtale', doc)
            tjek(m['fit'], 'svar.spil[].meldesamtale.fit', doc)
            for niveau in (m['udgang'], m['slem']):
                if niveau is not None:
                    tjek(niveau, 'svar.spil[].meldesamtale.niveau', doc)
            tjek(m['ejer'], 'svar.spil[].meldesamtale.ejer', doc)
            tjek(m['ejer']['bedst'], 'svar.spil[].meldesamtale.ejer.bedst', doc)
            tjek(spil['vaerd'], 'svar.spil[].vaerd', doc)
            for maerke in spil['vaerd']['maerker']:
                tjek(maerke, 'svar.spil[].vaerd.maerker[]', doc)
            tjek(spil['scorer'], 'svar.spil[].scorer', doc)
            tjek(spil['faktorer'], 'svar.spil[].faktorer', doc)
            tjek(spil['udspilseffekt'], 'svar.spil[].udspilseffekt', doc)
            # Vindue 1b: rådene og linjen
            tjek(spil['raad'], 'svar.spil[].raad', doc)
            tjek(spil['raad']['udspil'], 'svar.spil[].raad.udspil', doc)
            for n in spil['raad']['spilfoering'] + spil['raad']['modspil']:
                tjek(n, 'svar.spil[].raad.noeglebeslutning', doc)
                for a in n['alternativer']:
                    tjek(a, 'svar.spil[].raad.noeglebeslutning.alternativer[]', doc)
            for stik in spil['linje']:
                tjek(stik, 'svar.spil[].linje[]', doc)


def test_holdlisten_har_felterne_fra_svar_md(gemte_sider):
    doc = felter()
    status, svar = analyser({'url': HOLD_URL}, hent=gemte_sider)
    assert status == 200
    tjek(svar, 'vaelg-svar', doc)
    for valg in svar['vaelg']['hold']:
        tjek(valg, 'vaelg.hold[]', doc)
