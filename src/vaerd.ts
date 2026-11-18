/**
 * Spil værd at se på og meldesamtalen (SPEC-postmortem-2a-vaerd-at-se-paa.md): teksterne til mærkerne, meldesamtalens
 * felter og folder og gennemgangen, der kopieres og sendes med mail. Funktionen regner alt (`svar.vaerdAtSePaa`,
 * `svar.spil[].vaerd` og `svar.spil[].meldesamtale` i api/SVAR.md); her skrives det kun som tekst.
 */
import { dato, decimaler, kontrakt, medFortegn, opremsning, SYMBOL, tal } from './format';
import { T } from './tekster';
import type { Analyse, Benaevnelse, MeldeNiveau, MeldeSvar, Meldesamtale, Spil, VaerdMaerke } from './typer';
import { FAKTORER } from './typer';
import { viSpillede } from './udledt';

type Form = Analyse['turnering']['form'];
/** Valgene til udskrift og mail (Franks svar 3, 18. nov. 2026): "De 8", "Alle med mærker (N)" og "Alle spil". */
export type Valg = 'vaerd' | 'maerker' | 'alle';
export const VALG: readonly Valg[] = ['vaerd', 'maerker', 'alle'];
export type ChipArt = 'miss' | 'ok' | 'neutral' | 'held' | 'uheld';

/** Første bogstav som lille bogstav: "Anden kontrakt end feltet" → "anden kontrakt end feltet". */
const småt = (t: string) => t.charAt(0).toLocaleLowerCase('da') + t.slice(1);

/** Ét mærke som tekst, fx "Meldinger −2,3 point" og "Spilføring −1 stik". */
function mærkeTekst(m: { maerke: VaerdMaerke; tal: number | null }, form: Form): string {
  const M = T.vaerd.maerke;
  switch (m.maerke) {
    case 'udspil':
      return M.udspil(m.tal ?? 0);
    case 'meldinger':
      return M.meldinger(tal(m.tal ?? 0, decimaler(form)), T.vaerd.enhed[form]);
    case 'spilfoering':
      return M.spilfoering(m.tal ?? 0);
    case 'modspil':
      return M.modspil(m.tal ?? 0);
    case 'heldigt':
    case 'uheldigt':
      return M[m.maerke]('');
    default:
      return M[m.maerke];
  }
}

const ART: Record<VaerdMaerke, ChipArt> = {
  bund: 'miss', top: 'ok', udgangMisset: 'miss', slemMisset: 'miss', udgangUdenDaekning: 'miss', slemUdenDaekning: 'miss',
  strafdobling: 'miss', udspil: 'miss', meldinger: 'miss', spilfoering: 'miss', modspil: 'miss', andenKontrakt: 'neutral',
  heldigt: 'held', uheldigt: 'uheld',
};

/**
 * Spillets mærker som tekst i svarets rækkefølge. Heldigt og Uheldigt er ét mærke med grunden, og spillets andre mærker
 * står i grunden (forslag 10): "Heldigt: top, udspillet kostede 1 stik", "Uheldigt: bund, ingen fejl".
 */
export function vaerdMaerker(a: Analyse, s: Spil): { tekst: string; art: ChipArt }[] {
  const v = s.vaerd;
  if (!s.spillet || !v) return [];
  const form = a.turnering.form;
  const held = v.maerker.find((m) => m.maerke === 'heldigt' || m.maerke === 'uheldigt');
  if (!held) return v.maerker.map((m) => ({ tekst: mærkeTekst(m, form), art: ART[m.maerke] }));
  const har = (n: VaerdMaerke) => v.maerker.some((m) => m.maerke === n);
  const G = T.vaerd.grund;
  const heldigt = held.maerke === 'heldigt';
  const resultat = heldigt ? (har('top') ? G.top : G.godt) : har('bund') ? G.bund : G.daarligt;
  const andre = v.maerker.filter((m) => m !== held && m.maerke !== 'bund' && m.maerke !== 'top').map((m) => småt(mærkeTekst(m, form)));
  const grund = [resultat, ...(heldigt ? [] : [G.ingenFejl]), ...andre].join(', ');
  return [{ tekst: (heldigt ? T.vaerd.maerke.heldigt : T.vaerd.maerke.uheldigt)(grund), art: ART[held.maerke] }];
}

/** Linjen for et spil i listen: "N 4♠ · 11 stik · +450" (udspillet står i analysevinduet). */
export function kortLinje(s: Spil): string {
  if (!s.spillet) return s.point !== null ? T.aften.justeret : T.aften.ikkeSpillet;
  if (s.kontrakt === 'Pas' || !s.spilfoerer) return `${T.aften.pasLinje} · ${medFortegn(s.score ?? 0)}`;
  return T.vaerd.linje(T.pladsKort[s.spilfoerer], kontrakt(s.kontrakt!), s.stik!, medFortegn(s.score!));
}

/** Resultatet: "28,6 %" ved parturnering og "+3 imp" ved holdturnering; tomt, når spillet ikke har point. */
export function resultatTekst(a: Analyse, s: Spil): string {
  if (s.point === null) return '';
  return a.turnering.form === 'par' ? `${tal(s.procent ?? 0)} %` : T.vaerd.imp(medFortegn(s.point));
}

/**
 * Spillene i et valg: de 8 på listen "Spil værd at se på", alle spil med mærker (den lange liste og derefter de andre
 * spil med mærker, `vaerdAtSePaa.medMaerker`) eller alle aftenens spil.
 */
export function valgteSpil(a: Analyse, valg: Valg): Spil[] {
  if (valg === 'alle') return a.spil;
  const v = a.vaerdAtSePaa;
  const numre = valg === 'vaerd' ? v?.liste : (v?.medMaerker ?? (v ? [...v.liste, ...v.resten] : undefined));
  return (numre ?? []).map((n) => a.spil.find((s) => s.nummer === n)).filter((s): s is Spil => !!s);
}

/** Den lange liste: de 8 og resten under "Vis alle", i listens rækkefølge. */
export function langListe(a: Analyse): Spil[] {
  const v = a.vaerdAtSePaa;
  if (!v) return [];
  return [...v.liste, ...v.resten].map((n) => a.spil.find((s) => s.nummer === n)).filter((s): s is Spil => !!s);
}

// Meldesamtalen

const B = (f: Benaevnelse) => T.meldesamtale.benaevnelse[f];
const ord = (svar: MeldeSvar) => T.meldesamtale.ord[svar];

/** "12 stik i sans og hjerter". */
export const stikTekst = (n: MeldeNiveau) => T.meldesamtale.stik(n.stik[0]?.stik ?? 0, opremsning(n.stik.map((x) => B(x.farve))));

/** "2 af 7 borde", ved holdturnering "det andet bord" eller "ikke det andet bord". */
export const bordeTekst = (n: MeldeNiveau, form: Form) =>
  form === 'par' ? T.meldesamtale.borde(n.borde, n.af) : n.borde > 0 ? T.meldesamtale.andetBord : T.meldesamtale.ikkeAndetBord;

export type Felt = 'fit' | 'udgang' | 'slem';

export interface StatusFelt {
  felt: Felt;
  navn: string;
  /** Null ved slem, når udgang er nej ("–"). */
  svar: MeldeSvar | null;
  symbol: string;
  ord: string;
  grund: string;
}

/** De tre statusfelter FIT, UDGANG og SLEM med symbol, ord og en kort grund. */
export function statusFelter(m: Meldesamtale, form: Form): StatusFelt[] {
  const N = T.meldesamtale.navn;
  const niveau = (felt: 'udgang' | 'slem', n: MeldeNiveau | null): StatusFelt =>
    n
      ? { felt, navn: N[felt], svar: n.svar, symbol: T.meldesamtale.symbol[n.svar], ord: ord(n.svar), grund: bordeTekst(n, form) }
      : { felt, navn: N[felt], svar: null, symbol: '', ord: T.meldesamtale.ingen, grund: T.meldesamtale.kunVedUdgang };
  return [
    { felt: 'fit', navn: N.fit, svar: m.fit.svar, symbol: T.meldesamtale.symbol[m.fit.svar], ord: ord(m.fit.svar), grund: T.meldesamtale.fitFelt(m.fit.kort, B(m.fit.farve)) },
    niveau('udgang', m.udgang),
    niveau('slem', m.slem),
  ];
}

export interface Fold {
  felt: Felt;
  titel: string;
  tekst: string;
  /**
   * "Spørg hinanden": kun ved måske, fit "Nej", meldt uden dækning og fit "Ja" med en kontrakt uden for fittets farve
   * og sans; ellers tom, og folden er lukket (forslag 9).
   */
  spoerg: string[];
}

type Kontrakten = Pick<Spil, 'kontrakt' | 'spilfoerer' | 'retning'>;

/**
 * Fit "Ja", og I var spilfører i en farvekontrakt, der hverken er i fittets farve eller i sans (Franks svar 3, 18. nov.
 * 2026), fx spil 7 den 16. november: S 2♦ med 8 hjerter. Spillede modparten, eller blev spillet meldt pas, var
 * trumffarven ikke jeres.
 */
export function andenTrumf(m: Meldesamtale, s: Kontrakten): boolean {
  if (m.fit.svar !== 'ja' || !s.kontrakt || s.kontrakt === 'Pas' || !viSpillede(s)) return false;
  const farve = /^\d(NT|[CDHS])/.exec(s.kontrakt)?.[1];
  return !!farve && farve !== 'NT' && farve !== m.fit.farve;
}

/** Folderne under statusfelterne: dem med spørgsmål først (som på skærm 2), ellers fit, udgang, slem. */
export function folder(m: Meldesamtale, form: Form, s: Kontrakten): Fold[] {
  const M = T.meldesamtale;
  const facit = (n: MeldeNiveau, niveau: 'udgang' | 'slem') =>
    form === 'par' ? M.facit(stikTekst(n), M.borde(n.borde, n.af), M.niveau[niveau]) : M.facitHold(stikTekst(n), n.borde > 0, M.niveau[niveau]);
  const fordeling = m.fit.fordeling.join('–');
  const ud: Fold[] = [
    {
      felt: 'fit',
      titel: M.fold(M.navn.fit, ord(m.fit.svar).toLocaleLowerCase('da')),
      tekst: (m.fit.svar === 'ja' ? M.fitJa : M.fitNej)(m.fit.kort, B(m.fit.farve), fordeling),
      spoerg: m.fit.svar === 'nej' ? M.spoerg.fit : andenTrumf(m, s) ? M.spoerg.trumf : [],
    },
    {
      felt: 'udgang',
      titel: M.fold(M.navn.udgang, ord(m.udgang.svar).toLocaleLowerCase('da')),
      tekst: facit(m.udgang, 'udgang'),
      spoerg:
        m.udgang.svar === 'maaske' ? M.spoerg.udgangMaaske : m.udgang.svar === 'nej' && m.udgang.meldt && !m.slem?.meldt ? M.spoerg.udgangUden : [],
    },
  ];
  if (m.slem) {
    ud.push({
      felt: 'slem',
      titel: M.fold(M.navn.slem, ord(m.slem.svar).toLocaleLowerCase('da')),
      tekst: facit(m.slem, 'slem'),
      spoerg: m.slem.svar === 'maaske' ? M.spoerg.slemMaaske : m.slem.svar === 'nej' && m.slem.meldt ? M.spoerg.slemUden : [],
    });
  }
  return [...ud.filter((f) => f.spoerg.length > 0), ...ud.filter((f) => f.spoerg.length === 0)];
}

/** "Var overstikket afgørende?": Ja, Nej eller "–" ved pas. */
export const overstikTekst = (m: Meldesamtale) =>
  m.overstikAfgoerende === null ? T.meldesamtale.ingen : m.overstikAfgoerende ? T.meldesamtale.ord.ja : T.meldesamtale.ord.nej;

/** "Hvem ejede spillet?": siden og, med konkurrence, trumftallet og det bedste for jer. */
export function ejerTekst(m: Meldesamtale): { hoved: string; detalje: string | null } {
  const e = m.ejer;
  const M = T.meldesamtale;
  if (!e.side) return { hoved: M.ingenEjer, detalje: null };
  const side = M.side[e.side];
  if (!e.konkurrence) return { hoved: M.ingenKonkurrence(side), detalje: null };
  const { jer, modparten } = e.trumf;
  const trumf = M.trumf(`${jer.kort} ${B(jer.farve)}`, `${modparten.kort} ${B(modparten.farve)}`, jer.kort + modparten.kort);
  const k = e.bedst.kontrakter.map(kontrakt).join(T.spil.eller);
  const bedst = !k ? '' : e.bedst.spilfoerer === 'jer' ? M.bedstSelv(k) : e.bedst.spilfoerer === 'modparten' ? M.bedstForsvar(k) : '';
  return { hoved: M.konkurrence(side), detalje: trumf + bedst };
}

/** Meldesamtalen kort til mailen og udskriften: grunden står ved måske og ved meldt uden dækning. */
export function meldeKort(m: Meldesamtale, form: Form): string {
  const M = T.meldesamtale;
  const niveau = (navn: string, n: MeldeNiveau) =>
    M.kortNiveau(navn, ord(n.svar).toLocaleLowerCase('da'), n.svar === 'maaske' || (n.svar === 'nej' && n.meldt) ? `${stikTekst(n)}; ${bordeTekst(n, form)}` : '');
  return [
    M.kortFit(ord(m.fit.svar).toLocaleLowerCase('da'), m.fit.kort, SYMBOL[m.fit.farve]),
    niveau(M.navn.udgang, m.udgang),
    ...(m.slem ? [niveau(M.navn.slem, m.slem)] : []),
  ].join(' ');
}

/** Spørgsmålene til spillet ("Spørg hinanden") i felternes rækkefølge, til udskriften. */
export function spoergsmaal(m: Meldesamtale, form: Form, s: Kontrakten): string[] {
  const rækkefølge: Felt[] = ['fit', 'udgang', 'slem'];
  return folder(m, form, s)
    .sort((x, y) => rækkefølge.indexOf(x.felt) - rækkefølge.indexOf(y.felt))
    .flatMap((f) => f.spoerg);
}

// Mailen

/** "16. november" uden år, til mailens emne. */
const datoKort = (iso: string) => dato(iso).replace(/ \d{4}$/, '');

/** Mailens emne: "Post Mortem: 16. november, 50,4 %" eller "Post Mortem: 11. november, −15 imp". */
export function emne(a: Analyse): string {
  return a.turnering.form === 'par'
    ? T.mail.emnePar(datoKort(a.turnering.dato), tal(a.resultat.procent ?? 0))
    : T.mail.emneHold(datoKort(a.turnering.dato), medFortegn(a.resultat.imp ?? 0));
}

/**
 * Gennemgangen som ren tekst (afsnit 4, skærm 3): aftenen og resultatet, faktorerne og pr. spil kontrakt, resultat,
 * procent, mærker og meldesamtalen kort med "Kommentar:" og to tomme linjer efter. Ingen navne: ved holdturnering står
 * bordet og retningen, ikke holdets navn.
 */
export function gennemgang(a: Analyse, valg: Valg): string {
  const G = T.gennemgang;
  const form = a.turnering.form;
  const d = decimaler(form);
  const linjer = [G.titel(dato(a.turnering.dato))];
  if (form === 'par') {
    linjer.push(G.aften(a.turnering.navn, a.spil.length), G.resultatPar(tal(a.resultat.procent ?? 0), tal(a.resultat.point ?? 0, d), tal(a.resultat.top ?? 0, d)));
  } else {
    const retning = a.deltager.retning ? T.retning[a.deltager.retning] : '';
    linjer.push(a.turnering.navn, G.bord(a.deltager.bord ?? 0, retning, a.spil.length), G.resultatHold(medFortegn(a.resultat.imp ?? 0)));
  }
  const faktor = (f: (typeof FAKTORER)[number]) => `${G.faktorNavn[f]} ${medFortegn(a.faktorer[f], d)}`;
  linjer.push('', G.faktorer[form], `${faktor('meldinger')} · ${faktor('spilfoering')}`, `${faktor('modspil')} · ${faktor('held')}`, '');
  const spil = valgteSpil(a, valg);
  linjer.push(G.overskrift[valg](spil.length), '');
  for (const s of spil) {
    linjer.push([`${T.spil.titel(s.nummer)}`, kortLinje(s), resultatTekst(a, s)].filter(Boolean).join(' · '));
    const m = vaerdMaerker(a, s).map((x, i) => (i === 0 ? x.tekst : småt(x.tekst)));
    if (m.length) linjer.push(m.join(' · '));
    if (s.spillet && s.meldesamtale) linjer.push(meldeKort(s.meldesamtale, form));
    linjer.push(G.kommentar, '', '');
  }
  const uheldige = a.vaerdAtSePaa?.uheldige ?? [];
  if (valg === 'vaerd' && uheldige.length) linjer.push(G.uheldige(opremsning(uheldige.map(String))), '');
  linjer.push(G.adresse);
  return linjer.join('\n');
}
