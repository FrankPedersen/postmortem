/**
 * Kaldet til funktionen. Adressen står kun her. Under udvikling går kaldet gennem Vites proxy (vite.config.ts), så
 * funktionens CORS ikke skal ændres.
 */
import { T } from './tekster';
import type { Analyse, VaelgSvar } from './typer';

export const ADRESSE = 'https://kontraktbridge-postmortem.azurewebsites.net/api/analyse';
const MÅL = import.meta.env.DEV ? '/api/analyse' : ADRESSE;

export type Resultat =
  | { type: 'analyse'; svar: Analyse }
  | { type: 'vaelg'; svar: VaelgSvar }
  | { type: 'fejl'; tekst: string };

/** Linket skal begynde med https://resultater.bridge.dk/, før det sendes. */
export function erBridgeDk(url: string): boolean {
  const u = url.trim();
  if (!u.startsWith('https://resultater.bridge.dk/')) return false;
  try {
    return new URL(u).hostname === 'resultater.bridge.dk';
  } catch {
    return false;
  }
}

const fejl = (tekst: string): Resultat => ({ type: 'fejl', tekst });

export async function analysér(url: string, hold?: string): Promise<Resultat> {
  if (!url.trim()) return fejl(T.fejl.tomt);
  if (!erBridgeDk(url)) return fejl(T.fejl.ikkeBridgeDk);
  let svar: Response;
  try {
    svar = await fetch(MÅL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hold ? { url: url.trim(), hold } : { url: url.trim() }),
    });
  } catch {
    return fejl(T.fejl.net);
  }
  if (svar.status === 429) return fejl(T.fejl.forMange);
  let krop: { fejl?: unknown; vaelg?: unknown; spil?: unknown } | null = null;
  try {
    krop = await svar.json();
  } catch {
    krop = null;
  }
  // Funktionens fejltekster vises, som de er (api/SVAR.md).
  if (!svar.ok) return fejl(typeof krop?.fejl === 'string' ? krop.fejl : T.fejl.net);
  if (krop?.vaelg) return { type: 'vaelg', svar: krop as unknown as VaelgSvar };
  if (Array.isArray(krop?.spil)) return { type: 'analyse', svar: krop as unknown as Analyse };
  return fejl(T.fejl.net);
}
