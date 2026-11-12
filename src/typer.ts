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
  udspilseffekt: { point: number; udspilAf: 'parret' | 'modparten'; ukendt: boolean } | null;
  maerker: unknown[];
}

export interface Analyse {
  turnering: Turnering;
  deltager: Deltager;
  resultat: { procent: number | null; point: number | null; top: number | null; imp: number | null };
  faktorer: Faktorer;
  stoersteForbedring: 'meldinger' | 'spilfoering' | 'modspil' | null;
  spil: Spil[];
}

export const FAKTORER: readonly Faktor[] = ['meldinger', 'spilfoering', 'modspil', 'held'];
