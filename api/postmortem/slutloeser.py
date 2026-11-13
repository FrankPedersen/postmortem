"""Slutstillingsløseren (SPEC-postmortem-1b-maerker.md): dobbeltdummy for stillinger med få kort, i ren Python.

Løseren svarer på "kan spilførersiden tage mindst k af de resterende stik?" med alfa-beta, en transpositionstabel og
ækvivalente kort (kort i følge i samme hånd regnes som ét). Uden tilvalg giver den samme tal som DDS. De to tilvalg er
de tænkte spil, som mærkerne måles med:

- `pas_ved_afkast`: de nævnte modspillere må passe, når de ikke kan bekende: de lægger intet kort og beholder alle
  deres. De kan derfor ende med kort til overs; spillet slutter, når de resterende stik er spillet.
- `giv_udspil`: de nævnte modspillere må, når de er inde, give udspillet fra sig: spilfører skal så selv spille ud,
  fra hånden eller bordet efter eget valg, og intet stik er brugt.

Stillingen holdes som fire strenge, én pr. farve, med ejeren af hvert kort fra det højeste til det laveste ('0' og
'2' er spilførersiden, '1' og '3' modspillerne, i urets retning). Kun de kort, der er tilbage, står i strengen, så to
stillinger med samme rækkefølge af ejere er den samme stilling, og kort i følge er nabotegn. Et kort, der er spillet
i det igangværende stik, står som 'x', til stikket er slut.
"""
import time

PLADSER = 'NESW'
FARVER = 'SHDC'
RANG = 'AKQJT98765432'
TEGN = '0123'


class TidenUde(Exception):
    """Fristen er overskredet."""


def _grupper(s, c):
    """Indeks for det første kort i hver følge af spilleren c's kort i farven s."""
    ud = []
    i = s.find(c)
    n = len(s)
    while i >= 0:
        ud.append(i)
        j = i + 1
        while j < n and s[j] == c:
            j += 1
        i = s.find(c, j)
    return ud


class _Loeser:
    def __init__(self, trumf, pas, giv, frist):
        self.trumf = FARVER.index(trumf) if trumf != 'NT' else -1
        self.pas = pas          # mængde af spillere (1 og 3), der må passe ved afkast
        self.giv = giv          # mængde af spillere (1 og 3), der må give udspillet fra sig
        self.tt = {}
        self.noder = 0
        self.frist = frist      # tidspunkt (time.perf_counter) eller None

    # Mellem to stik

    def graense(self, farver, leder, r, k):
        """Kan spilførersiden tage mindst k af de r resterende stik, når `leder` spiller ud?"""
        if k <= 0:
            return True
        if k > r:
            return False
        noegle = (farver, leder)
        e = self.tt.get(noegle)
        if e is None:
            e = self.tt[noegle] = [0, r]
        elif k <= e[0]:
            return True
        elif k > e[1]:
            return False
        self.noder += 1
        if self.frist is not None and not self.noder & 1023 and time.perf_counter() > self.frist:
            raise TidenUde()
        svar = self._udspil(farver, leder, r, k)
        if svar:
            if k > e[0]:
                e[0] = k
        elif k - 1 < e[1]:
            e[1] = k - 1
        return svar

    def _udspil(self, farver, leder, r, k):
        spilfoerer = not leder & 1
        if not spilfoerer and leder in self.giv:
            # Modspilleren giver udspillet fra sig: spilfører vælger hånd.
            if not (self.graense(farver, 0, r, k) or self.graense(farver, 2, r, k)):
                return False
        c = TEGN[leder]
        trumf = self.trumf
        naeste = (leder + 1) & 3
        for f in self._farveorden(farver, c, spilfoerer):
            s = farver[f]
            g = _grupper(s, c)
            if len(g) > 2:      # det højeste først, så det laveste, så dem imellem
                g = [g[0], g[-1]] + g[1:-1]
            for i in g:
                nye = farver[:f] + (s[:i] + 'x' + s[i + 1:],) + farver[f + 1:]
                svar = self._laeg_til(nye, r, k, 1, naeste, f, leder, f == trumf, i)
                if svar == spilfoerer:
                    return svar
        return not spilfoerer

    def _farveorden(self, farver, c, spilfoerer):
        """Farverne, lederen har kort i: først dem, hvor lederen har farvens højeste kort."""
        top, andre = [], []
        for f in range(4):
            s = farver[f]
            if c in s:
                (top if s[0] == c else andre).append(f)
        return top + andre

    # I et stik

    def _laeg_til(self, farver, r, k, nr, spiller, farve, bedst, bedst_trumf, bedst_i):
        """`nr` spillere har lagt til; `spiller` er i tur. `bedst` har stikket med kortet `bedst_i` (i trumf, når
        `bedst_trumf`, ellers i den udspillede farve)."""
        if nr == 4:
            nye = tuple(s.replace('x', '') if 'x' in s else s for s in farver)
            if bedst & 1:
                return self.graense(nye, bedst, r - 1, k)
            return self.graense(nye, bedst, r - 1, k - 1)
        spilfoerer = not spiller & 1
        c = TEGN[spiller]
        naeste = (spiller + 1) & 3
        trumf = self.trumf
        s = farver[farve]
        if c in s:
            g = _grupper(s, c)
            # Kan spilleren vinde stikket, prøves det billigste kort, der gør det, først; ellers det laveste.
            orden = g[::-1]
            if bedst_trumf == (farve == trumf) and (bedst ^ spiller) != 2:   # makker har ikke stikket
                vindere = [i for i in g if i < bedst_i]
                if vindere and vindere[-1] != orden[0]:
                    orden.remove(vindere[-1])
                    orden.insert(0, vindere[-1])
            for i in orden:
                nye = farver[:farve] + (s[:i] + 'x' + s[i + 1:],) + farver[farve + 1:]
                if i < bedst_i and bedst_trumf == (farve == trumf):
                    svar = self._laeg_til(nye, r, k, nr + 1, naeste, farve, spiller, bedst_trumf, i)
                else:
                    svar = self._laeg_til(nye, r, k, nr + 1, naeste, farve, bedst, bedst_trumf, bedst_i)
                if svar == spilfoerer:
                    return svar
            return not spilfoerer
        # Kan ikke bekende: pas (når det er tilladt), trumf eller afkast.
        if spiller in self.pas:
            svar = self._laeg_til(farver, r, k, nr + 1, naeste, farve, bedst, bedst_trumf, bedst_i)
            if svar == spilfoerer:
                return svar
        if trumf >= 0 and trumf != farve:
            t = farver[trumf]
            if c in t:
                for i in _grupper(t, c)[::-1]:
                    nye = farver[:trumf] + (t[:i] + 'x' + t[i + 1:],) + farver[trumf + 1:]
                    if not bedst_trumf or i < bedst_i:
                        svar = self._laeg_til(nye, r, k, nr + 1, naeste, farve, spiller, True, i)
                    else:
                        svar = self._laeg_til(nye, r, k, nr + 1, naeste, farve, bedst, bedst_trumf, bedst_i)
                    if svar == spilfoerer:
                        return svar
        for f in range(4):
            if f == farve or f == trumf:
                continue
            t = farver[f]
            if c in t:
                for i in _grupper(t, c)[::-1]:
                    nye = farver[:f] + (t[:i] + 'x' + t[i + 1:],) + farver[f + 1:]
                    svar = self._laeg_til(nye, r, k, nr + 1, naeste, farve, bedst, bedst_trumf, bedst_i)
                    if svar == spilfoerer:
                        return svar
        return not spilfoerer


def _kort(haand):
    """'AJ.K..' -> [(0, 'A'), (0, 'J'), (1, 'K')]"""
    return [(f, k) for f, del_ in enumerate(haand.split('.')) for k in del_]


class Stilling:
    """En stilling, løseren kan spørges om flere gange (transpositionstabellen genbruges pr. sæt af tilvalg)."""

    def __init__(self, haender, trumf, udspiller, spilfoerer='S', igang=()):
        """haender: {'N': 'AJ.K..', ...} (spar.hjerter.ruder.klør) uden de kort, der er lagt i det igangværende stik;
        udspiller: den, der spiller eller spillede ud til stikket; igang: kortene i stikket indtil nu, fx ['CA']."""
        self.trumf = trumf
        skift = 0 if spilfoerer in 'NS' else 1
        self.plads = {p: (PLADSER.index(p) - skift) % 4 for p in PLADSER}
        ejer = {}
        for p in PLADSER:
            for f, k in _kort(haender[p]):
                ejer[(f, k)] = TEGN[self.plads[p]]
        leder = self.plads[udspiller]
        har_lagt = {(leder + n) % 4 for n in range(len(igang))}
        # Resterende stik, det igangværende medregnet: spilførersidens kort plus det, hånden har lagt i stikket
        self.r = max(len(_kort(haender[p])) + (self.plads[p] in har_lagt) for p in PLADSER if not self.plads[p] & 1)
        lagt = []
        for n, kort in enumerate(igang):
            f, k = FARVER.index(kort[0]), kort[1]
            ejer[(f, k)] = 'x'
            lagt.append((f, k))
        self.farver = tuple(''.join(ejer[(f, k)] for k in RANG if (f, k) in ejer) for f in range(4))
        self.leder = leder
        # Det igangværende stik: hvem der har det, og med hvilket kort
        self.nr = len(lagt)
        self.farve = self.bedst = self.bedst_i = None
        self.bedst_trumf = False
        t = FARVER.index(trumf) if trumf != 'NT' else -1
        for n, (f, k) in enumerate(lagt):
            i = [x for x in RANG if (f, x) in ejer].index(k)
            if n == 0:
                self.farve, self.bedst, self.bedst_trumf, self.bedst_i = f, leder, f == t, i
            elif f == self.farve and self.bedst_trumf == (f == t) and i < self.bedst_i:
                self.bedst, self.bedst_i = (leder + n) % 4, i
            elif f == t and f != self.farve and (not self.bedst_trumf or i < self.bedst_i):
                self.bedst, self.bedst_trumf, self.bedst_i = (leder + n) % 4, True, i
        self._loesere = {}

    def _loeser(self, pas, giv, frist):
        pas = frozenset(self.plads[p] for p in pas)
        giv = frozenset(self.plads[p] for p in giv)
        if any(not p & 1 for p in pas | giv):
            raise ValueError('tilvalgene gælder kun modspillerne')
        l = self._loesere.get((pas, giv))
        if l is None:
            l = self._loesere[(pas, giv)] = _Loeser(self.trumf, pas, giv, None)
        l.frist = None if frist is None else time.perf_counter() + frist
        if frist is not None and frist <= 0:
            raise TidenUde()
        return l

    def mindst(self, k, pas_ved_afkast=(), giv_udspil=(), frist=None):
        """Kan spilførersiden tage mindst k af de resterende stik (det igangværende medregnet)?"""
        l = self._loeser(pas_ved_afkast, giv_udspil, frist)
        if self.nr == 0:
            return l.graense(self.farver, self.leder, self.r, k)
        if k <= 0:
            return True
        if k > self.r:
            return False
        return l._laeg_til(self.farver, self.r, k, self.nr, (self.leder + self.nr) % 4, self.farve, self.bedst,
                           self.bedst_trumf, self.bedst_i)

    def stik(self, pas_ved_afkast=(), giv_udspil=(), frist=None, hoejst=None):
        """Spilførersidens stik med bedste spil fra begge sider; `hoejst` er en kendt øvre grænse (fx DDS' tal)."""
        start = time.perf_counter()
        k = self.r if hoejst is None else min(hoejst, self.r)
        while k > 0:
            rest = None if frist is None else frist - (time.perf_counter() - start)
            if self.mindst(k, pas_ved_afkast, giv_udspil, rest):
                return k
            k -= 1
        return 0


def stik(haender, trumf, udspiller, spilfoerer='S', pas_ved_afkast=(), giv_udspil=(), igang=(), frist=None):
    """Spilførersidens stik fra stillingen."""
    return Stilling(haender, trumf, udspiller, spilfoerer, igang).stik(pas_ved_afkast, giv_udspil, frist)


def mindst(k, haender, trumf, udspiller, spilfoerer='S', pas_ved_afkast=(), giv_udspil=(), igang=(), frist=None):
    """Kan spilførersiden tage mindst k stik fra stillingen?"""
    return Stilling(haender, trumf, udspiller, spilfoerer, igang).mindst(k, pas_ved_afkast, giv_udspil, frist)
