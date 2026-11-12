/**
 * Husets fagord i dansk tekst (../CLAUDE.md, Husets ord). Listen er Fordelingstrænerens (src/sprog/fagord.ts); testen er
 * `src/test/sprog.test.tsx`. "i snit" (gennemsnit) er tilladt.
 */

export const IKKE_ORD: readonly { mønster: RegExp; husets: string }[] = [
  { mønster: /\bdobbeltknib[a-zæøå]*/gi, husets: 'dobbelt kipning' },
  { mønster: /\bknib[a-zæøå]*/gi, husets: 'kipning' },
  { mønster: /\bkip(?:pe|per|pes|pet)?\b/gi, husets: 'kipning (som navneord)' },
  { mønster: /\bfald\s+eller\b|\bpå\s+fald\b|\bfald\s*=/gi, husets: 'toppe farven' },
  { mønster: /\bsnit(?:tet|ter|tene)?\b/gi, husets: 'kipning' },
  { mønster: /\bblindemand[a-zæøå]*/gi, husets: 'bordet' },
  { mønster: /\bden blinde\b/gi, husets: 'bordet' },
  { mønster: /\bbroer(?:ne)?\b/gi, husets: 'forbindelser, indgang' },
  { mønster: /\bHCP\b/g, husets: 'hp' },
  { mønster: /\bdobbeltton[a-zæøå]*/gi, husets: 'doubleton' },
  { mønster: /\bfittens?\b/gi, husets: 'fittet' },
  { mønster: /\ben\s+(?:\S+\s+)?(?:[0-9a-zæøå+]+-)*fit\b/gi, husets: 'et fit' },
  // Indspil kun om den særlige form for slutspil; appen bruger slutspil.
  { mønster: /\bindspil[a-zæøå]*/gi, husets: 'slutspil' },
];

/** Alle "Ikke"-ord i en dansk tekst som "ordet (husets ord)". */
export function fund(tekst: string): string[] {
  const ud: string[] = [];
  for (const { mønster, husets } of IKKE_ORD) {
    for (const m of tekst.matchAll(mønster)) {
      if (m[0].toLowerCase() === 'snit' && /\bi\s+$/i.test(tekst.slice(Math.max(0, m.index - 3), m.index))) continue;
      ud.push(`${m[0]} (${husets})`);
    }
  }
  return ud;
}
