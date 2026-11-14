/**
 * Fælles for accepttestene (SPEC-postmortem-1c-app.md): svarene fra funktionen kørt mod de anonymiserede testsider i
 * api/tests/data/, en falsk fetch og appen åbnet på en adresse.
 */
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { App } from '../App';
import { gem } from '../lager';
import type { Analyse, Spil, VaelgSvar } from '../typer';
import parData from './data/par-452.json';
import holdData from './data/hold-450.json';
import vaelgData from './data/hold-450-vaelg.json';

export const PAR_URL =
  'https://resultater.bridge.dk/template/personligt_regnskab.php?filename=2151/MT452GT720.XML&tournament=452&section=1&pairno=1';
export const HOLD_URL =
  'https://resultater.bridge.dk/template/multihold_bordresultater.php?filename=2151/MT450GT714.XML&tournament=450&section=2&round=2&half=1';

// En ny kopi hver gang, så en test kan ændre den.
export const par = (): Analyse => structuredClone(parData) as Analyse;
export const hold = (): Analyse => structuredClone(holdData) as Analyse;
export const vaelg = (): VaelgSvar => structuredClone(vaelgData) as VaelgSvar;

export function svar(status: number, krop: unknown): Response {
  return new Response(JSON.stringify(krop), { status, headers: { 'Content-Type': 'application/json' } });
}

/** En falsk fetch, der svarer med svarene i rækkefølge. */
export function falskFetch(...svarene: (Response | Promise<Response>)[]) {
  const f = vi.fn(async (_url: string, _init?: RequestInit) => {
    const næste = svarene.shift();
    if (!næste) throw new Error('fetch kaldt for mange gange');
    return næste;
  });
  vi.stubGlobal('fetch', f);
  return f;
}

/** Kroppen i fetch-kald nr. i. */
export function krop(f: ReturnType<typeof falskFetch>, i: number) {
  const init = f.mock.calls[i][1];
  return JSON.parse(String(init?.body));
}

/** Åbner appen på adressen; med et svar ligger det i sessionStorage, som efter en analyse. */
export function vis(hash: string, analyse?: Analyse, url = PAR_URL, holdliste?: VaelgSvar) {
  window.location.hash = hash;
  if (analyse) gem({ url, svar: analyse, vaelg: holdliste });
  return render(<App />);
}

/** Et spil, som funktionen sender det, når der ikke er et resultat ved bordet (api/postmortem/analyse.py, _ikke_spillet). */
export function ikkeSpillet(s: Spil): Spil {
  return {
    ...s, spillet: false, kontrakt: null, spilfoerer: null, udspil: null, stik: null, score: null, point: null, top: null,
    procent: null, felt: [], holdkammerater: null, ddFoer: null, ddEfter: null, scorer: null, faktorer: null,
    udspilseffekt: null, maerker: [],
    teknik: { beregnet: false, grund: 'ikke spillet', udspilAntaget: null, stikFoerP: null, skvis: null, indspil: null, kastIndSkvis: false },
    raad: null, linje: null,
  };
}

/** Den synlige tekst i et element med mellemrum samlet. */
export const tekst = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Kortene i en farve med husets bogstaver: E K D B 10. */
export const RANG: Record<string, string> = { A: 'E', K: 'K', Q: 'D', J: 'B', T: '10' };
export const farve = (kort: string) => [...kort].map((k) => RANG[k] ?? k).join('');
