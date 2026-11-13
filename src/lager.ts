/**
 * Svaret ligger i sessionStorage, så en genindlæsning ikke kræver et nyt kald; det forsvinder, når fanen lukkes
 * (SPEC-postmortem-1c-app.md: ingen lagring af aftener). tools/tjek_bredde.mjs bruger samme nøgle og form.
 */
import type { Analyse, VaelgSvar } from './typer';

export interface Tilstand {
  /** Linket, brugeren indsatte. */
  url: string;
  /** Holdlisten i holdturnering. */
  vaelg?: VaelgSvar;
  /** Analysen. */
  svar?: Analyse;
}

const NØGLE = 'postmortem';

export function gem(t: Tilstand): void {
  try {
    sessionStorage.setItem(NØGLE, JSON.stringify(t));
  } catch {
    // Privat vindue eller fuldt lager: appen virker stadig, indtil siden genindlæses.
  }
}

export function hent(): Tilstand | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(NØGLE) ?? 'null');
    return t && typeof t.url === 'string' ? (t as Tilstand) : null;
  } catch {
    return null;
  }
}
