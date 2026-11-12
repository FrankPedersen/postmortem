/** Det, appen udleder af svaret: middel, summer, mærker, feltets grupper og hp. Ingen beregning af bridge her. */
import { kontrakt, medFortegn, parKontrakt } from './format';
import { T } from './tekster';
import type { Analyse, Faktorer, Plads, Spil } from './typer';
import { FAKTORER } from './typer';

export const PLADSER: readonly Plads[] = ['N', 'E', 'S', 'W'];

/** Parret eller holdet var spilfører. */
export const viSpillede = (s: Spil) =>
  s.spilfoerer !== null && (s.retning === 'NS') === (s.spilfoerer === 'N' || s.spilfoerer === 'S');

export const faktorSum = (f: Faktorer) => FAKTORER.reduce((sum, k) => sum + f[k], 0);

/** Spillets sum af faktorerne = P(S_faktisk) − middel (SVAR.md). Null, når spillet ikke er spillet. */
export const spilSum = (s: Spil) => (s.spillet && s.faktorer ? faktorSum(s.faktorer) : null);

/** Middel for aftenen: halv top på hvert spillet spil i parturnering, 0 i holdturnering. */
export const middel = (a: Analyse) =>
  a.turnering.form === 'par' ? a.spil.filter((s) => s.spillet).reduce((sum, s) => sum + (s.top ?? 0) / 2, 0) : 0;

/** Holdets navn fra holdlisten, hvis den er der. */
export function holdNavn(a: Analyse, vaelg?: { vaelg: { hold: { id: string; hold: string }[] } }) {
  return vaelg?.vaelg.hold.find((h) => h.id === a.deltager.id)?.hold ?? null;
}

export type Art = 'miss' | 'ok' | 'neutral';

/** Stik efter udspillet med åbne kort; med ukendt udspil max før udspil (som scorer.ddEfter i SVAR.md). */
const efterUdspil = (s: Spil) => s.ddEfter ?? s.ddFoer;

/**
 * Mærket for spillets største faktor (SPEC-postmortem-1c-app.md, skærm 3): den mest negative af spilføring, udspil,
 * resten af modspillet og meldinger; er ingen negativ, den største positive spilføring eller modspil; ellers Bedste
 * kontrakt eller Bedste modspil. Held tæller ikke: det er ikke noget, parret gjorde.
 */
export function maerke(s: Spil): { tekst: string; art: Art } {
  if (!s.spillet || !s.faktorer) return { tekst: T.maerke.ikkeSpillet, art: 'neutral' };
  const f = s.faktorer;
  const udspil = s.udspilseffekt?.udspilAf === 'parret' ? s.udspilseffekt.point : 0;
  const dele: ['spilfoering' | 'udspil' | 'modspil' | 'meldinger', number][] = [
    ['spilfoering', f.spilfoering], ['udspil', udspil], ['modspil', f.modspil - udspil], ['meldinger', f.meldinger],
  ];
  const mindst = dele.reduce((m, d) => (d[1] < m[1] ? d : m));
  const størst = dele.reduce((m, d) => (d[1] > m[1] ? d : m));
  const efter = efterUdspil(s);
  const kendt = s.stik !== null && efter !== null;
  if (mindst[1] < 0) {
    if (mindst[0] === 'meldinger') return { tekst: T.maerke.meldinger(parTekstKort(s)), art: 'miss' };
    if (mindst[0] === 'spilfoering' && kendt) return { tekst: T.maerke.spilfoering(medFortegn(s.stik! - efter!)), art: 'miss' };
    if (mindst[0] === 'udspil' && s.ddFoer !== null && efter !== null) return { tekst: T.maerke.udspil(medFortegn(s.ddFoer - efter)), art: 'miss' };
    if (mindst[0] === 'modspil' && kendt) return { tekst: T.maerke.modspil(medFortegn(efter! - s.stik!)), art: 'miss' };
  }
  if (størst[1] > 0 && størst[0] === 'spilfoering' && kendt) return { tekst: T.maerke.spilfoering(medFortegn(s.stik! - efter!)), art: 'ok' };
  if (størst[1] > 0 && størst[0] === 'modspil' && kendt) return { tekst: T.maerke.modspil(medFortegn(efter! - s.stik!)), art: 'ok' };
  return { tekst: viSpillede(s) || s.kontrakt === 'Pas' ? T.maerke.bedsteKontrakt : T.maerke.bedsteModspil, art: 'ok' };
}

/** Par-kontrakten kort til mærket: "1NT", og med siden, når det er modpartens kontrakt. */
function parTekstKort(s: Spil): string {
  const p = s.par.kontrakter[0];
  if (!p) return kontrakt('Pas');
  const { kontrakt: k, side } = parKontrakt(p);
  return side && side !== s.retning ? `${T.retningKort[side]} ${k}` : k;
}

/** Procent eller imp for spillet som art: under 40 % eller negativ imp er tab, over 60 % eller positiv er gevinst. */
export function resultatArt(a: Analyse, s: Spil): Art {
  if (!s.spillet) return 'neutral';
  if (a.turnering.form === 'par') return s.procent! < 40 ? 'miss' : s.procent! > 60 ? 'ok' : 'neutral';
  return s.point! < 0 ? 'miss' : s.point! > 0 ? 'ok' : 'neutral';
}

/** Feltets scorer med jeres egen, fra højeste til laveste, samlet med antal. */
export function feltGrupper(s: Spil): { score: number; antal: number; jer: boolean }[] {
  if (s.score === null) return [];
  const alle = [...s.felt, s.score].sort((x, y) => y - x);
  const ud: { score: number; antal: number; jer: boolean }[] = [];
  for (const v of alle) {
    const sidste = ud.at(-1);
    if (sidste && sidste.score === v) sidste.antal++;
    else ud.push({ score: v, antal: 1, jer: v === s.score });
  }
  return ud;
}

/** Honnørpoint i en hånd i PBN: E 4, K 3, D 2, B 1. */
export function hp(haand: string): number {
  const v: Record<string, number> = { A: 4, K: 3, Q: 2, J: 1 };
  return [...haand].reduce((sum, k) => sum + (v[k] ?? 0), 0);
}
