"""Accepttest 3, 4 og 5 i SPEC-postmortem-1b-maerker.md, skrevet før løseren: mærkerne og nøglebeslutningerne.

3. Mærkerne på slutstillingerne er som forventet: mærke, retning, stik, kort og `uden`.
4. Hele spil giver de forventede mærker, og de negative giver ingen.
5. Nøglebeslutninger: T9 giver hjerter 2 i stik 1, T5 hjerter 3 og T10 klør 3; ingen side har mere end tre pr. spil.
"""
import pytest

from pbnfil import HELE_SPIL, SLUTSTILLINGER, TESTSPIL, felter, haender
from postmortem import teknik


def stilling(st):
    return teknik.analyser(haender(st['Deal']), st['Trump'], 'S', udspiller='S')


def helt_spil(sp):
    return teknik.analyser(haender(sp['Deal']), sp['Contract'][1:].rstrip('X'), sp['Declarer'], udspil=sp['Lead'])


def som_forventet(fundet, tekst, v):
    """Sammenligner et mærke med felterne i testsættet ('mod=W stik=1 kort=CA farver=SH uden=2')."""
    forventet = felter(tekst)
    assert fundet is not None
    assert fundet['mod'] == forventet['mod']
    assert fundet['stik'] == int(forventet['stik'])
    assert fundet['kort'] == forventet['kort']
    if 'farver' in forventet:
        assert ''.join(fundet['farver']) == forventet['farver']
    assert fundet['medTeknik'] == v
    assert fundet['udenTeknik'] == int(forventet['uden'])


@pytest.mark.parametrize('st', SLUTSTILLINGER, ids=lambda st: st['Stilling'])
def test_3_maerkerne_paa_slutstillingerne(st):
    svar = stilling(st)
    t = svar['teknik']
    assert t['beregnet'] is True and t['stikFoerP'] == 0
    assert svar['maerker'] == [m for m in ('skvis', 'indspil') if m.capitalize() in st]
    if 'Skvis' in st:
        som_forventet(t['skvis'], st['Skvis'], int(st['V']))
    else:
        assert t['skvis'] is None
    if 'Indspil' in st:
        som_forventet(t['indspil'], st['Indspil'], int(st['V']))
        assert 'farver' not in t['indspil']
    else:
        assert t['indspil'] is None
    assert t['kastIndSkvis'] is ('KastIndSkvis' in st)


def test_3_testsaettet_har_de_stillinger_specen_kraever():
    navne = [st['Stilling'] for st in SLUTSTILLINGER]
    assert {f'T{n}' for n in range(1, 12)} <= set(navne)
    nye = [st for st in SLUTSTILLINGER if st['Stilling'] in ('T12', 'T13', 'T14', 'T15', 'T16', 'T17')]
    assert len(nye) == 6
    assert sum(1 for st in nye if 'Skvis' not in st and 'Indspil' not in st) == 3  # tre negative
    assert any(st['Trump'] != 'NT' and 'Skvis' in st for st in nye)                # skvis i en trumfkontrakt
    assert any('Indspil' in st and len(haender(st['Deal'])['S'].replace('.', '')) >= 5 for st in nye)


@pytest.mark.parametrize('sp', HELE_SPIL, ids=lambda sp: sp['Board'])
def test_4_hele_spil_giver_de_forventede_maerker(sp):
    svar = helt_spil(sp)
    t = svar['teknik']
    assert t['beregnet'] is True and t['udspilAntaget'] is False and t['stikFoerP'] == 7
    assert svar['maerker'] == sp['Maerker'].split()
    for navn in ('skvis', 'indspil'):
        if navn in svar['maerker']:
            assert t[navn]['mod'] == felter(sp[navn.capitalize()])['mod']
            assert 8 <= t[navn]['stik'] <= 13 and t[navn]['kort']
            assert t[navn]['medTeknik'] == int(sp['Med'])
            assert t[navn]['udenTeknik'] == int(sp['Uden'])
        else:
            assert t[navn] is None
    assert t['kastIndSkvis'] is ('KastIndSkvis' in sp)


def test_4_testsaettet_har_fire_udvidede_og_to_uden_maerker():
    assert sum(1 for sp in HELE_SPIL if sp['Maerker']) >= 4
    assert sum(1 for sp in HELE_SPIL if not sp['Maerker']) >= 2


@pytest.mark.parametrize('sp', TESTSPIL, ids=lambda sp: 'spil ' + sp['Board'])
def test_4_de_tre_spil_fra_afproevningen_regnes(sp):
    # Resultatet står i Afklaret, og rådgiveren afgør, om det er rigtigt. Lektionens indspil i spil 1 forventes ikke
    # fundet, fordi dobbeltdummy giver 9 stik uden.
    svar = helt_spil(sp)
    assert svar['teknik']['beregnet'] is True
    assert len(svar['linje']) == 13
    if sp['Board'] == '1':
        assert 'indspil' not in svar['maerker']


@pytest.mark.parametrize('navn, stik, haand, kort', [('T9', 1, 'S', 'H2'), ('T5', 1, 'S', 'H3'), ('T10', 1, 'S', 'C3')])
def test_5_noeglebeslutningerne_i_t9_t5_og_t10(navn, stik, haand, kort):
    st = next(s for s in SLUTSTILLINGER if s['Stilling'] == navn)
    assert felter(st['Noeglebeslutning']) == {'stik': str(stik), 'haand': haand, 'kort': kort}
    svar = stilling(st)
    fundet = [n for n in svar['raad']['spilfoering'] if (n['stik'], n['haand'], n['kort']) == (stik, haand, kort)]
    assert len(fundet) == 1, svar['raad']['spilfoering']
    n = fundet[0]
    assert n['dd'] == int(st['V'])
    assert 1 <= len(n['alternativer']) <= 2
    assert all(a['dd'] < n['dd'] and a['kort'] for a in n['alternativer'])
    if navn == 'T9':
        assert all(a['dd'] <= 4 for a in n['alternativer'])   # andre kort: højst 4 stik


def test_5_frafaldet_i_spil_2_fra_afproevningen():
    # Ruder dame ud: konge fra bordet og es fra hånden koster hver et stik (8 mod 9). Begge hænder har to små
    # kort, der holder; valget mellem at vinde stikket og at dykke tæller alligevel (Franks ændring 14. november 2026).
    sp = next(s for s in TESTSPIL if s['Board'] == '2')
    raad = helt_spil(sp)['raad']['spilfoering']
    dyk = {(n['stik'], n['haand'], n['kort']): n for n in raad}
    assert dyk[(1, 'N', 'D6')]['alternativer'] == [{'kort': ['DK'], 'dd': 8}]
    assert dyk[(1, 'S', 'D5')]['alternativer'] == [{'kort': ['DA'], 'dd': 8}]
    assert dyk[(1, 'N', 'D6')]['dd'] == dyk[(1, 'S', 'D5')]['dd'] == 9


def test_5_en_topvinder_i_udspil_taeller_kun_naar_et_andet_kort_ogsaa_vinder():
    def udspil(svar):
        foerst = {(n + 1, s['udspiller'], s['kort'][0]) for n, s in enumerate(svar['linje'])}
        return [(n['stik'], n['kort']) for n in svar['raad']['spilfoering'] if (n['stik'], n['haand'], n['kort']) in foerst]

    def stilling_(navn):
        return stilling(next(s for s in SLUTSTILLINGER if s['Stilling'] == navn))

    # T1: klør es er Syds eneste vinder; spar 4 og hjerter 2 taber stikket. Skviskortet står stadig i mærket.
    t1 = stilling_('T1')
    assert udspil(t1) == [] and t1['teknik']['skvis']['kort'] == 'CA'
    # T7: spar es vinder også stikket, så klør es først er en beslutning.
    assert (1, 'CA') in udspil(stilling_('T7'))
    # T9, T5 og T10: kortet er ikke en topvinder.
    assert (1, 'H2') in udspil(stilling_('T9')) and (1, 'H3') in udspil(stilling_('T5')) and (1, 'C3') in udspil(stilling_('T10'))
    # H1 og H2: Syd indkasserer en gående klørfarve; de to andre farver afgiver stik. Ingen af dem tæller.
    for navn in ('H1', 'H2'):
        assert udspil(helt_spil(next(s for s in HELE_SPIL if s['Board'] == navn))) == [], navn


def test_5_to_kort_der_holder_er_ikke_en_noeglebeslutning():
    # Specens T9 og T10: hjerter dame og spar 8 holder også DD-tallet i stik 1.
    for navn in ('T9a', 'T10a'):
        st = next(s for s in SLUTSTILLINGER if s['Stilling'] == navn)
        assert not [n for n in stilling(st)['raad']['spilfoering'] if n['stik'] == 1 and n['haand'] == 'S'], navn


def test_5_hoejst_tre_noeglebeslutninger_pr_side():
    alle = [stilling(st) for st in SLUTSTILLINGER] + [helt_spil(sp) for sp in HELE_SPIL + TESTSPIL]
    for svar in alle:
        for side in ('spilfoering', 'modspil'):
            liste = svar['raad'][side]
            assert len(liste) <= 3
            for n in liste:
                assert set(n) == {'stik', 'haand', 'kort', 'dd', 'maerke', 'alternativer'}
                assert (n['haand'] in 'NS') == (side == 'spilfoering')
            # Kort, der hører til et mærke, står først; derefter det tidligste stik først.
            orden = [(n['maerke'] is None, n['stik']) for n in liste]
            assert orden == sorted(orden)


def test_fristen_giver_beregnet_falsk_med_grunden_tid():
    sp = HELE_SPIL[0]
    teknik.glem()
    svar = teknik.analyser(haender(sp['Deal']), 'NT', 'S', udspil=sp['Lead'], frist=0.0)
    assert svar['maerker'] == []
    assert svar['teknik']['beregnet'] is False and svar['teknik']['grund'] == 'tid'
    assert svar['teknik']['skvis'] is None and svar['teknik']['indspil'] is None
