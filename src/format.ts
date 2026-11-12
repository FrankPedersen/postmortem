/** Tal, kort, kontrakter og datoer på dansk: komma som decimaltegn, "−" som minus og husets bogstaver E K D B. */
import { T } from './tekster';

export const MINUS = '−';

const rund = (n: number) => Math.round(n * 100) / 100;

/** 62.28 → "62,28", −15 → "−15". */
export function tal(n: number): string {
  const r = rund(n);
  return (r < 0 ? MINUS : '') + String(Math.abs(r)).replace('.', ',');
}

/** 23 → "+23", −2 → "−2", 0 → "0". */
export function medFortegn(n: number): string {
  return rund(n) > 0 ? `+${tal(n)}` : tal(n);
}

export const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣', NT: 'NT' };
const RANG: Record<string, string> = { A: 'E', K: 'K', Q: 'D', J: 'B', T: '10' };

/** Kortene i en farve: "AJT8" → "EB108". */
export const kortene = (farve: string) => [...farve].map((k) => RANG[k] ?? k).join('');

/** Ét kort som i udspillet: "CJ" → "♣B". */
export const kort = (k: string) => `${SYMBOL[k[0]] ?? k[0]}${kortene(k.slice(1))}`;

/** "4S" → "4♠", "3NTX" → "3NT D", "5DXX" → "5♦ RD", "Pas" → "Pas". */
export function kontrakt(k: string): string {
  const m = /^([1-7])(NT|[CDHS])(X{0,2})$/.exec(k);
  if (!m) return k === 'Pas' ? T.pas : k;
  const dobling = m[3] === 'XX' ? ` ${T.redoblet}` : m[3] === 'X' ? ` ${T.doblet}` : '';
  return `${m[1]}${SYMBOL[m[2]]}${dobling}`;
}

/** Par-kontrakten fra svaret: "3NT NS+1" → { kontrakt: "3NT", side: "NS", tekst: "N–S 3NT +1" }. */
export function parKontrakt(p: string): { kontrakt: string; side: string; tekst: string } {
  const m = /^(\S+)\s+(NS|OV|EW)([+=-]\d*)$/.exec(p);
  if (!m) return { kontrakt: p, side: '', tekst: p };
  const resultat = m[3].replace('-', MINUS);
  const side = m[2] === 'EW' ? 'OV' : m[2];
  return { kontrakt: kontrakt(m[1]), side, tekst: `${T.retningKort[side]} ${kontrakt(m[1])} ${resultat}` };
}

/** "2026-11-04" → "4. november 2026". */
export function dato(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}. ${T.maaneder[Number(m[2]) - 1]} ${m[1]}`;
}
