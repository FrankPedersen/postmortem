"""Modpartens fejl (SPEC-postmortem-1c-app.md, Afklaret; Franks godkendelse 12. november 2026): Spilføring og Modspil er
højst 0. Den positive del, hvor modparten spillede eller spillede modspil dårligere end med åbne kort, ligger under
Held og uheld og står for sig i `modpartensFejl`. De fire faktorer lægger stadig op til P(S_faktisk) − middel."""
import pytest

from conftest import HOLD_URL, PAR_URL
from postmortem.analyse import analyser

FAKTORER = ('meldinger', 'spilfoering', 'modspil', 'held')


@pytest.fixture(params=[{'url': PAR_URL}, {'url': HOLD_URL, 'hold': '2-NS'}, {'url': HOLD_URL, 'hold': '6-OV'}],
                ids=['par-452', 'hold-2-NS', 'hold-6-OV'])
def svar(request, gemte_sider):
    status, s = analyser(request.param, hent=gemte_sider)
    assert status == 200
    return s


def middel(svar):
    return svar['turnering']['top'] / 2 if svar['turnering']['form'] == 'par' else 0


def test_spilfoering_og_modspil_er_hoejst_0(svar):
    spillede = [s for s in svar['spil'] if s['spillet']]
    assert spillede
    for s in spillede:
        assert s['faktorer']['spilfoering'] <= 0, s['nummer']
        assert s['faktorer']['modspil'] <= 0, s['nummer']
    assert svar['faktorer']['spilfoering'] <= 0 and svar['faktorer']['modspil'] <= 0


def test_modpartens_fejl_er_den_positive_del_og_ligger_i_held(svar):
    fejl = 0
    for s in svar['spil']:
        if not s['spillet']:
            assert s['modpartensFejl'] is None
            continue
        f = s['faktorer']
        efter = s['ddEfter'] if s['ddEfter'] is not None else s['ddFoer']
        mf = s['modpartensFejl']
        assert mf >= 0, s['nummer']
        if s['kontrakt'] == 'Pas':
            assert mf == 0
            continue
        vi = (s['spilfoerer'] in 'NS') == (s['retning'] == 'NS')
        # Modparten fejlede, når parret tog flere stik end DD efter udspillet som spilfører, eller spilfører tog færre.
        flere = (s['stik'] - efter) if vi else (efter - s['stik'])
        # Et ekstra stik kan give samme point (spil 31 i 452: 250 og 200 slår de samme scorer), men aldrig omvendt.
        if mf > 0:
            assert flere > 0, s['nummer']
        if flere <= 0:
            assert mf == 0, s['nummer']
        # Uden modpartens fejl ville spilføringen eller modspillet have været positivt med samme beløb.
        if mf > 0:
            assert f['spilfoering' if vi else 'modspil'] <= 0
        fejl += mf
    assert fejl > 0  # dataene har spil, hvor modparten fejlede


def test_summen_er_stadig_resultatet_mod_middel(svar):
    m = middel(svar) if svar['turnering']['form'] == 'hold' else None
    for s in svar['spil']:
        if s['spillet']:
            mid = s['top'] / 2 if svar['turnering']['form'] == 'par' else 0
            assert sum(s['faktorer'][k] for k in FAKTORER) == pytest.approx(s['point'] - mid), s['nummer']
    total = sum(svar['faktorer'][k] for k in FAKTORER)
    if svar['turnering']['form'] == 'par':
        assert total == pytest.approx(svar['resultat']['point'] - svar['resultat']['top'] / 2)
    else:
        assert m == 0 and total == pytest.approx(svar['resultat']['imp'])


def test_spil_1_i_452_spilfoerer_fejlede(gemte_sider):
    # Øst spillede 3NT og tog 8 stik, hvor 9 kunne tages efter udspillet: før 9 point i Modspil, nu Modpartens fejl.
    status, s = analyser({'url': PAR_URL}, hent=gemte_sider)
    spil1 = s['spil'][0]
    assert (spil1['kontrakt'], spil1['spilfoerer'], spil1['stik'], spil1['ddEfter']) == ('3NT', 'E', 8, 9)
    assert spil1['faktorer'] == {'meldinger': 0, 'spilfoering': 0, 'modspil': 0, 'held': 2}
    assert spil1['modpartensFejl'] == 9


def test_aftenens_sum_er_uaendret_for_par_1(gemte_sider):
    status, s = analyser({'url': PAR_URL}, hent=gemte_sider)
    assert sum(s['faktorer'].values()) == 279 - 224
    assert s['stoersteForbedring'] in ('meldinger', 'spilfoering', 'modspil')
