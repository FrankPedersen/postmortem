"""Den bedste linje (SPEC-postmortem-1b-maerker.md): et dobbeltdummy-rigtigt spil, kort for kort, med DDS.

Begge sider vælger i hvert kort blandt de kort, der holder DD-tallet, efter faste regler, så linjen er den samme ved
hver kørsel. Reglerne står kun her (`vaelg`):

- Spilførersiden i udspil: først et kort i en farve, hvor begge modspillere har kort (så ingen tvinges til afkast, og
  en skvis ikke udløses før tid); ellers den første farve i rækkefølgen klør, ruder, hjerter, spar; højeste kort i
  farven.
- Spilførersiden ellers: vinder stikket så billigt som muligt (ikke, når makker allerede har stikket), ellers laveste
  kort.
- Modspillerne: laveste kort; ved afkast fra den længste farve; i udspil den første farve i rækkefølgen klør, ruder,
  hjerter, spar.
- Kort i følge i samme hånd: det laveste.

Kort skrives 'SA', 'HT', 'C3' (farve og rang). DD-tal er spilførersidens stik i hele spillet (eller fra stillingens
begyndelse, når linjen starter i en slutstilling).
"""
import time

from endplay.dds import solve_board
from endplay.types import Card, Deal

from .regn import _LAAS, FARVER as DDS_FARVER, SPILLERE as DDS_SPILLERE
from .slutloeser import TidenUde

PLADSER = 'NESW'
RANG = '23456789TJQKA'
REGELORDEN = 'CDHS'     # klør, ruder, hjerter, spar


def rang(kort):
    return RANG.index(kort[1])


def laes_haender(haender):
    """{'N': 'AJ.K..', ...} -> {'N': ['SA', 'SJ', 'HK'], ...}"""
    return {p: [f + k for f, del_ in zip('SHDC', haender[p].split('.')) for k in del_] for p in PLADSER}


def skriv_haender(haender):
    """{'N': ['SA', 'SJ', 'HK'], ...} -> {'N': 'AJ.K..', ...}"""
    return {p: '.'.join(''.join(sorted((k[1] for k in haender[p] if k[0] == f), key=RANG.index, reverse=True))
                        for f in 'SHDC') for p in PLADSER}


class Linje:
    """Et spil i gang. `stik` er de færdige stik, `traek` hvert kort med de muligheder, spilleren havde."""

    def __init__(self, haender, trumf, spilfoerer, udspiller, frist=None):
        self.haender = laes_haender(haender)
        self.trumf = trumf
        self.spilfoerer = spilfoerer
        self.side = 'NS' if spilfoerer in 'NS' else 'EW'
        self.udspiller = udspiller      # den, der spiller ud til det igangværende stik
        self.igang = []                 # [(plads, kort)] i det igangværende stik
        self.vundet = 0                 # spilførersidens stik indtil nu
        self.rest = max(len(self.haender[p]) for p in self.side)    # stik tilbage, det igangværende medregnet
        self.stik = []
        self.traek = []
        self.stillinger = []            # stillingen ved begyndelsen af hvert stik
        self.frist = frist              # tidspunkt (time.perf_counter) eller None
        self._deal = Deal('N:' + ' '.join(haender[p] for p in PLADSER))
        self._deal.trump = DDS_FARVER[trumf]
        self._deal.first = DDS_SPILLERE[udspiller]

    @property
    def i_tur(self):
        return PLADSER[(PLADSER.index(self.udspiller) + len(self.igang)) % 4]

    def er_spilfoerer(self, plads):
        return plads in self.side

    # DDS

    def vaerdier(self):
        """{kort: spilførersidens stik i alt, hvis kortet spilles} for spilleren i tur."""
        if self.frist is not None and time.perf_counter() > self.frist:
            raise TidenUde()
        with _LAAS:
            raa = [(c.suit.name[0].upper() + c.rank.abbr, t) for c, t in solve_board(self._deal)]
        if self.er_spilfoerer(self.i_tur):
            return {k: self.vundet + t for k, t in raa}
        return {k: self.vundet + self.rest - t for k, t in raa}

    # Kort i følge

    def grupper(self, plads):
        """Spillerens kort delt i følger: kort i samme farve uden et andet kort imellem (hverken på en anden hånd
        eller i det igangværende stik). Hver gruppe står fra det laveste til det højeste."""
        andre = {k for p in PLADSER if p != plads for k in self.haender[p]} | {k for _, k in self.igang}
        ud = []
        for f in 'SHDC':
            mine = sorted((k for k in self.haender[plads] if k[0] == f), key=rang)
            gruppe = []
            for k in mine:
                if gruppe and any(f + RANG[i] in andre for i in range(rang(gruppe[-1]) + 1, rang(k))):
                    ud.append(gruppe)
                    gruppe = []
                gruppe.append(k)
            if gruppe:
                ud.append(gruppe)
        return ud

    def lovlige(self, plads):
        mine = self.haender[plads]
        if self.igang:
            farve = self.igang[0][1][0]
            i_farven = [k for k in mine if k[0] == farve]
            if i_farven:
                return i_farven
        return list(mine)

    def muligheder(self, plads):
        """De lovlige kort som grupper af kort i følge."""
        lovlige = set(self.lovlige(plads))
        return [g for g in self.grupper(plads) if g[0] in lovlige]

    # Stikket

    def slaar(self, kort, bedste):
        """Slår `kort` det kort, der har stikket nu?"""
        if kort[0] == bedste[0]:
            return rang(kort) > rang(bedste)
        return kort[0] == self.trumf

    def bedste(self):
        """(plads, kort) for det kort, der har stikket nu."""
        b = self.igang[0]
        for p, k in self.igang[1:]:
            if self.slaar(k, b[1]):
                b = (p, k)
        return b

    # Reglerne

    def vaelg(self, holder):
        """Kortet blandt `holder` (kort, der holder DD-tallet) efter de faste regler."""
        plads = self.i_tur
        mine = self.haender[plads]
        if self.er_spilfoerer(plads):
            if not self.igang:
                modspillere = [p for p in PLADSER if not self.er_spilfoerer(p)]
                begge = {f for f in 'SHDC' if all(any(k[0] == f for k in self.haender[p]) for p in modspillere)}
                kandidater = [k for k in holder if k[0] in begge] or holder
                farve = min((k[0] for k in kandidater), key=REGELORDEN.index)
                valgt = max((k for k in kandidater if k[0] == farve), key=rang)
            else:
                b_plads, b_kort = self.bedste()
                vindere = [] if self.er_spilfoerer(b_plads) else [k for k in holder if self.slaar(k, b_kort)]
                if vindere:
                    valgt = min(vindere, key=lambda k: (k[0] != self.igang[0][1][0], rang(k)))
                else:
                    valgt = self._laveste(holder)
        elif not self.igang:
            farve = min((k[0] for k in holder), key=REGELORDEN.index)
            valgt = min((k for k in holder if k[0] == farve), key=rang)
        elif holder[0][0] == self.igang[0][1][0]:
            valgt = min(holder, key=rang)
        else:   # afkast: fra den længste farve
            laengde = {f: sum(1 for k in mine if k[0] == f) for f in 'SHDC'}
            farve = min((k[0] for k in holder), key=lambda f: (-laengde[f], REGELORDEN.index(f)))
            valgt = min((k for k in holder if k[0] == farve), key=rang)
        # Kort i følge i samme hånd: det laveste
        return next(g for g in self.grupper(plads) if valgt in g)[0]

    def _laveste(self, kort):
        """Laveste kort; ved afkast helst ikke en trumf, og ved samme rang den første farve i regelordenen."""
        return min(kort, key=lambda k: (k[0] == self.trumf and k[0] != self.igang[0][1][0], rang(k),
                                        REGELORDEN.index(k[0])))

    # Spillet

    def spil_kort(self, kort, vaerdier=None, givet=False):
        """Spiller et kort for spilleren i tur og gemmer trækket."""
        plads = self.i_tur
        if not self.igang:
            self.stillinger.append({'haender': {p: list(self.haender[p]) for p in PLADSER},
                                    'udspiller': self.udspiller, 'vundet': self.vundet, 'rest': self.rest})
        self.traek.append({
            'stik': len(self.stik) + 1, 'haand': plads, 'kort': kort, 'vaerdier': vaerdier, 'givet': givet,
            'muligheder': self.muligheder(plads), 'igang': list(self.igang),
            'haender': {p: list(self.haender[p]) for p in PLADSER}, 'udspiller': self.udspiller,
            'vundet': self.vundet, 'rest': self.rest,
        })
        self.haender[plads].remove(kort)
        self.igang.append((plads, kort))
        self._deal.play(Card(kort))
        if len(self.igang) == 4:
            vinder = self.bedste()[0]
            self.stik.append({'udspiller': self.udspiller, 'kort': [k for _, k in self.igang], 'vinder': vinder})
            if self.er_spilfoerer(vinder):
                self.vundet += 1
            self.rest -= 1
            self.udspiller = vinder
            self.igang = []

    def spil_et_kort(self, foretraek=None):
        """Spiller ét kort efter reglerne. `foretraek(linje, holder, vaerdi)` kan snævre modspillernes valg ind."""
        v = self.vaerdier()
        plads = self.i_tur
        maal = max(v.values()) if self.er_spilfoerer(plads) else min(v.values())
        holder = [k for k in self.lovlige(plads) if v[k] == maal]
        if foretraek is not None and not self.er_spilfoerer(plads) and len(holder) > 1:
            holder = foretraek(self, holder, maal) or holder
        self.spil_kort(self.vaelg(holder), v)

    def spil_til(self, rest, foretraek=None):
        """Spiller efter reglerne, til der er `rest` stik tilbage og intet stik er i gang."""
        while self.rest > rest or self.igang:
            self.spil_et_kort(foretraek)
