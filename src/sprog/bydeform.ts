/**
 * Beskrivende form (husets regel i ../CLAUDE.md, Franks valg 30. oktober 2026): instruktioner og forklaringer skrives i
 * beskrivende form, ikke i bydeform. Knapper og links er undtaget. Ordlisten er Fordelingstrænerens
 * (src/sprog/bydeform.ts) plus forsidens og konventionstrænerens ord; testen er `src/test/sprog.test.tsx`.
 */

/** Udsagnsord i bydeform, der kan stå først i en dansk instruktion. "Pas" mangler med vilje: det er meldingen. */
export const BYDEFORMER: ReadonlySet<string> = new Set(
  `afbryd angiv annullér behold bemærk brug byg eksportér erstat find fjern flyt fold følg fortsæt gem gentag giv gruppér
  gå gæt hent hold husk importér indsæt kig kip klik kom kopiér kryds lad luk lås læg læs markér navngiv noter notér
  nulstil opdatér overskriv prøv regn ret ryd sammenlign se send sikr skift skriv slet slå spil spring start stop svar sæt
  tag tast tjek træk træn tryk tæl tænk udfyld udled undgå vent vis vælg vurdér øv åbn
  søg filtrér skjul lær spørg indtast bekræft tilføj vend afslut overvej meld byd dobl doble genmeld genåbn kæmp ofr
  kontrollér vær bliv gør glem sørg gennemgå lån sælg udskriv analysér kopier`.split(/\s+/),
);

/** Knapper og links, der bliver i bydeform. */
export const UNDTAGELSER: readonly (string | RegExp)[] = [
  'Analysér',
  // Funktionens svar ved 429 og appens besked ved en netfejl, som "Prøv igen senere" i de andre repoer.
  'Prøv igen om lidt.',
];

/**
 * Tekster, der begynder med et af ordene, men ikke er bydeform: "Spil 7" er spillets navn, "Brug Bordresultater …" er
 * funktionens fejltekst (api/SVAR.md), og "Hold 1" er et holdnavn.
 */
export const FALSKE_TRÆF: readonly RegExp[] = [/^Spil \d+\b/, /^Brug Bordresultater eller Personligt regnskab$/, /^Hold \d+\b/];

const PREFIX = /^[\s"'“„«(\[▶→←↓↑✓✗·•–—#*>-]*/;

const undtaget = (tekst: string) => {
  const t = tekst.trim();
  return UNDTAGELSER.some((u) => (typeof u === 'string' ? u === t : u.test(t)));
};

/** Sætningerne i en dansk tekst, der begynder med et udsagnsord i bydeform, også efter kolon og semikolon. */
export function bydeform(tekst: string): string[] {
  if (undtaget(tekst) || /^[a-zæøå-]+$/.test(tekst.trim())) return [];
  const ud: string[] = [];
  for (const led of tekst.split(/(?<=[.!?])(?<!\b(?:[Pp]r|[Cc]a|[Ff]x|[Kk]l|[Nn]r)\.)\s+|[:;]\**\s+|\n+/)) {
    const s = led.replace(PREFIX, '').trim();
    const første = s.match(/^[A-Za-zÆØÅæøåÉé]+/)?.[0];
    if (!første || !BYDEFORMER.has(første.toLowerCase())) continue;
    if (undtaget(s) || FALSKE_TRÆF.some((r) => r.test(led.trim()) || r.test(s))) continue;
    ud.push(s);
  }
  return ud;
}
