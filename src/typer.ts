/** Svaret fra `POST /api/analyse`, som det er beskrevet i `api/SVAR.md`. */

export type Plads = 'N' | 'E' | 'S' | 'W';
export type Retning = 'NS' | 'OV';
export type Benaevnelse = 'C' | 'D' | 'H' | 'S' | 'NT';
export type Faktor = 'meldinger' | 'spilfoering' | 'modspil' | 'held';

export interface Turnering {
  navn: string;
  titel: string | null;
  dato: string;
  form: 'par' | 'hold';
  skala: 'matchpoint' | 'imp';
  top: number | null;
  id: string;
  sektion: string;
  runde: string | null;
  halvleg: string | null;
}

export interface HoldValg {
  id: string;
  hold: string;
  retning: Retning;
  bord: number;
}

export interface VaelgSvar {
  turnering: Turnering;
  vaelg: { hold: HoldValg[] };
}

export interface Deltager {
  type: 'par' | 'hold';
  nummer?: number;
  id?: string;
  retning?: Retning;
  bord?: number;
}

export type Faktorer = Record<Faktor, number>;

/** Mærkerne fra vindue 1b: en skvis eller et indspil er nødvendigt i de sidste seks stik (SVAR.md, Teknik og råd). */
export type Maerke = 'skvis' | 'indspil';
export type Kuloer = 'S' | 'H' | 'D' | 'C';

export interface TeknikMaerke {
  /** Pladsen på den modspiller, teknikken er mod, eller begge, eller en af dem. */
  mod: Plads | 'begge' | 'en af dem';
  stik: number | null;
  kort: string | null;
  /** Kun skvis: de farver, den skviste modspiller har kort i ved skvisstikket. */
  farver?: Kuloer[];
  medTeknik: number;
  udenTeknik: number;
}

export interface Teknik {
  beregnet: boolean;
  grund: 'ikke spillet' | 'pas' | 'tid' | 'fejl' | null;
  udspilAntaget: boolean | null;
  stikFoerP: number | null;
  skvis: TeknikMaerke | null;
  indspil: TeknikMaerke | null;
  kastIndSkvis: boolean;
}

export interface Noeglebeslutning {
  stik: number;
  haand: Plads;
  kort: string;
  /** Spilførersidens stik i hele spillet, når kortet spilles. */
  dd: number;
  maerke: Maerke | null;
  alternativer: { kort: string[]; dd: number }[];
}

export interface Raad {
  spilfoering: Noeglebeslutning[];
  modspil: Noeglebeslutning[];
  udspil: { faktisk: string | null; pris: number | null; bedste: string[][] };
}

export interface LinjeStik {
  udspiller: Plads;
  kort: string[];
  vinder: Plads;
}

export interface MaerkeTal {
  spil: number;
  somSpilfoerer: number;
  taget: number;
}

export interface Teknikker {
  skvis: MaerkeTal;
  indspil: MaerkeTal;
  spilfoerer: { spil: number; ddStik: number };
}

// v2a (SPEC-postmortem-2a-vaerd-at-se-paa.md, SVAR.md): meldesamtalen og listen "Spil værd at se på".

export type MeldeSvar = 'ja' | 'maaske' | 'nej';

export interface MeldeNiveau {
  svar: MeldeSvar;
  /** De vindende benævnelser med flest stik (ved nej benævnelserne med flest stik). */
  stik: { farve: Benaevnelse; stik: number }[];
  /** Borde i feltet, hvor jeres side spillede på niveauet eller højere, og antal borde i feltet (1 ved holdturnering). */
  borde: number;
  af: number;
  meldt: boolean;
}

export interface Meldesamtale {
  fit: { svar: 'ja' | 'nej'; farve: Kuloer; kort: number; fordeling: number[] };
  udgang: MeldeNiveau;
  /** Null ("–"), når udgang er nej, og I ikke meldte slem. */
  slem: MeldeNiveau | null;
  overstikAfgoerende: boolean | null;
  ejer: {
    side: 'jer' | 'modparten' | null;
    konkurrence: boolean;
    trumf: { jer: { farve: Kuloer; kort: number }; modparten: { farve: Kuloer; kort: number } };
    bedst: { spilfoerer: 'jer' | 'modparten' | null; kontrakter: string[] };
  };
}

export type VaerdMaerke =
  | 'bund' | 'top' | 'udgangMisset' | 'slemMisset' | 'udgangUdenDaekning' | 'slemUdenDaekning' | 'strafdobling'
  | 'udspil' | 'meldinger' | 'spilfoering' | 'modspil' | 'andenKontrakt' | 'heldigt' | 'uheldigt';

export interface Vaerd {
  /** Den negative del af meldinger, spilføring og modspil. */
  omkostning: number;
  maerker: { maerke: VaerdMaerke; tal: number | null }[];
}

export interface VaerdAtSePaa {
  liste: number[];
  resten: number[];
  uheldige: number[];
}

export interface Spil {
  nummer: number;
  giver: Plads;
  zone: 'None' | 'NS' | 'EW' | 'All';
  haender: Record<Plads, string>;
  ddTabel: Record<Plads, Record<Benaevnelse, number>>;
  ddSide: Record<Plads, Record<Benaevnelse, number>> | null;
  ddAfvigelse: boolean;
  par: { scoreNS: number; score: number; kontrakter: string[] };
  retning: Retning;
  spillet: boolean;
  kontrakt: string | null;
  spilfoerer: Plads | null;
  udspil: string | null;
  stik: number | null;
  score: number | null;
  point: number | null;
  top: number | null;
  procent: number | null;
  felt: number[];
  holdkammerater: number | null;
  ddFoer: number | null;
  ddEfter: number | null;
  scorer: { faktisk: number; ddEfter: number; ddFoer: number; par: number } | null;
  faktorer: Faktorer | null;
  /** Den del af held, hvor modparten fejlede: max(0, P(S_faktisk) − P(S_ddEfter)) (SVAR.md). */
  modpartensFejl: number | null;
  udspilseffekt: { point: number; udspilAf: 'parret' | 'modparten'; ukendt: boolean } | null;
  maerker: Maerke[];
  /** De tre næste mangler i et svar fra før vindue 1b (det kan ligge i sessionStorage i en åben fane). */
  teknik?: Teknik;
  raad?: Raad | null;
  linje?: LinjeStik[] | null;
  /** De to næste mangler i et svar fra før v2a. */
  meldesamtale?: Meldesamtale | null;
  vaerd?: Vaerd | null;
}

export interface Analyse {
  turnering: Turnering;
  deltager: Deltager;
  resultat: { procent: number | null; point: number | null; top: number | null; imp: number | null };
  faktorer: Faktorer;
  stoersteForbedring: 'meldinger' | 'spilfoering' | 'modspil' | null;
  teknikker?: Teknikker;
  vaerdAtSePaa?: VaerdAtSePaa;
  spil: Spil[];
}

export const FAKTORER: readonly Faktor[] = ['meldinger', 'spilfoering', 'modspil', 'held'];
