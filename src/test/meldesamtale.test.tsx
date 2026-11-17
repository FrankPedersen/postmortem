// @vitest-environment jsdom
// Accepttest 2 og 3 i SPEC-postmortem-2a-vaerd-at-se-paa.md, skrevet før bygningen: kortet Meldesamtalen øverst i
// analysevinduet med FIT, UDGANG og SLEM (symbol, ord og en kort grund), "Spørg hinanden" kun ved måske, fit "Nej" og
// meldt uden dækning, og de to linjer om overstikket og hvem der ejede spillet. Spørgsmålene står kun i src/tekster.ts.
import { cleanup, screen, within } from '@testing-library/react';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Analyse } from '../typer';
import { hold, HOLD_URL, PAR_3287_URL, par3287, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

// Spørgsmålene fra specen (afsnit 2, tjeklistens punkt 2–3) med husets ord: "et muligt majorfit".
const SPØRG = {
  fit: ['Undersøgte vi majorfarverne?', 'Viste vi vores længder?', 'Stoppede vi i 3NT før et muligt majorfit?'],
  udgangMåske: ['Inviterede vi, da vi skulle?', 'Passede en af os for tidligt?'],
  udgangUden: ['Meldte vi udgang uden nok information?'],
  slemMåske: ['Undersøgte vi slem?', 'Havde vi styr på esser og nøglekort?', 'Var 6NT eller slem i farve rigtigst ved parturnering?'],
  slemUden: ['Pressede vi for hårdt?', 'Havde vi kontrol i sidefarverne?'],
};

const kortet = () => screen.getByRole('region', { name: 'Meldesamtalen' });
const felter = () => within(kortet()).getAllByRole('listitem').filter((li) => li.classList.contains('status-felt')).map(tekst);
const fold = (navn: string) => within(kortet()).getByText(navn, { selector: 'summary' }).closest('details')!;
const spørgsmål = (d: Element) => [...d.querySelectorAll('.spoerg li')].map(tekst);
const linje = (navn: string) => tekst(within(kortet()).getByText(navn).nextElementSibling);

type Svar = 'ja' | 'maaske' | 'nej';
interface Niveau { svar: Svar; stik: { farve: string; stik: number }[]; borde: number; af: number; meldt: boolean }
interface Meldesamtale {
  fit: { svar: 'ja' | 'nej'; farve: string; kort: number; fordeling: number[] };
  udgang: Niveau;
  slem: Niveau | null;
  overstikAfgoerende: boolean | null;
  ejer: {
    side: 'jer' | 'modparten' | null;
    konkurrence: boolean;
    trumf: { jer: { farve: string; kort: number }; modparten: { farve: string; kort: number } };
    bedst: { spilfoerer: 'jer' | 'modparten' | null; kontrakter: string[] };
  };
}

/** Testsvaret for 16. november med en anden meldesamtale på spil 1 (konstrueret). */
function med(m: Partial<Meldesamtale>, data: Analyse = par3287(), nummer = 1): Analyse {
  const s = data.spil.find((x) => x.nummer === nummer) as unknown as { meldesamtale: Meldesamtale };
  s.meldesamtale = { ...s.meldesamtale, ...m };
  return data;
}
const niveau = (svar: Svar, borde: number, meldt = false, stik = [{ farve: 'S', stik: 10 }], af = 7): Niveau => ({ svar, stik, borde, af, meldt });

describe('Meldesamtalen, 16. november', () => {
  it('står øverst i analysevinduet, før bordet', () => {
    vis('#/spil/1', par3287(), PAR_3287_URL);
    const k = kortet();
    expect(k.compareDocumentPosition(screen.getByRole('figure', { name: /^Bordet/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tekst(within(k).getByRole('heading', { level: 2 }))).toBe('Meldesamtalen');
  });

  it('spil 1: fit ja, udgang ja, slem måske med 0 af 7 borde og spørgsmålene til slem', () => {
    vis('#/spil/1', par3287(), PAR_3287_URL);
    expect(felter()).toEqual(['Fit ✓ Ja 9 hjerter', 'Udgang ✓ Ja 7 af 7 borde', 'Slem ~ Måske 0 af 7 borde']);
    const slem = fold('Slem: måske');
    expect(slem.open).toBe(true);
    expect(tekst(slem)).toContain('Facit: 12 stik i sans og hjerter med åbne kort; 0 af 7 borde meldte slem.');
    expect(tekst(slem.querySelector('.spoerg-titel'))).toBe('Spørg hinanden');
    expect(spørgsmål(slem)).toEqual(SPØRG.slemMåske);
    for (const navn of ['Fit: ja', 'Udgang: ja']) {
      expect(fold(navn).open, navn).toBe(false);
      expect(spørgsmål(fold(navn)), navn).toEqual([]);
    }
    expect(tekst(fold('Fit: ja'))).toContain('9 hjerter (6–3).');
    expect(tekst(fold('Udgang: ja'))).toContain('Facit: 12 stik i sans og hjerter med åbne kort; 7 af 7 borde meldte udgang.');
    // De folder med spørgsmål står først (som på skærm 2).
    expect([...kortet().querySelectorAll('summary')].map(tekst)).toEqual(['Slem: måske', 'Fit: ja', 'Udgang: ja']);
    expect(linje('Var overstikket afgørende?')).toBe('Ja');
    expect(linje('Hvem ejede spillet?')).toBe('I (ingen konkurrence)');
  });

  it('spil 17: udgang meldt uden dækning, slem "–" og konkurrence med trumftallet', () => {
    vis('#/spil/17', par3287(), PAR_3287_URL);
    expect(felter()).toEqual(['Fit ✓ Ja 9 klør', 'Udgang ✗ Nej 1 af 7 borde', 'Slem – kun ved udgang']);
    const udgang = fold('Udgang: nej');
    expect(udgang.open).toBe(true);
    expect(tekst(udgang)).toContain('Facit: 8 stik i hjerter og klør med åbne kort; 1 af 7 borde meldte udgang.');
    expect(spørgsmål(udgang)).toEqual(SPØRG.udgangUden);
    expect(within(kortet()).queryByText(/^Slem:/, { selector: 'summary' })).toBeNull();
    expect(linje('Hvem ejede spillet?')).toBe(
      'Modparten (konkurrence) Trumf: jer 9 klør, modparten 8 spar, i alt 17 (loven om totale stik). Bedst for jer: at forsvare mod 3♠.',
    );
  });

  it('konstrueret: udgang måske uden at have meldt den har spørgsmålene til udgang', () => {
    vis('#/spil/1', med({ udgang: niveau('maaske', 2), slem: niveau('nej', 0) }), PAR_3287_URL);
    expect(felter()).toEqual(['Fit ✓ Ja 9 hjerter', 'Udgang ~ Måske 2 af 7 borde', 'Slem ✗ Nej 0 af 7 borde']);
    expect(fold('Udgang: måske').open).toBe(true);
    expect(spørgsmål(fold('Udgang: måske'))).toEqual(SPØRG.udgangMåske);
    // Slem: nej, når I ikke meldte slem, har ingen spørgsmål og er foldet sammen (forslag 9).
    expect(fold('Slem: nej').open).toBe(false);
    expect(spørgsmål(fold('Slem: nej'))).toEqual([]);
  });

  it('konstrueret: fit nej har spørgsmålene til fit', () => {
    vis('#/spil/1', med({ fit: { svar: 'nej', farve: 'S', kort: 7, fordeling: [4, 3] } }), PAR_3287_URL);
    expect(felter()[0]).toBe('Fit ✗ Nej 7 spar');
    expect(fold('Fit: nej').open).toBe(true);
    expect(tekst(fold('Fit: nej'))).toContain('7 spar (4–3): ingen farve med 8 kort.');
    expect(spørgsmål(fold('Fit: nej'))).toEqual(SPØRG.fit);
  });

  it('konstrueret: udgang nej uden at have meldt den er foldet sammen uden spørgsmål', () => {
    vis('#/spil/1', med({ udgang: niveau('nej', 0, false, [{ farve: 'S', stik: 9 }]), slem: null }), PAR_3287_URL);
    expect(felter().slice(1)).toEqual(['Udgang ✗ Nej 0 af 7 borde', 'Slem – kun ved udgang']);
    expect(fold('Udgang: nej').open).toBe(false);
    expect(spørgsmål(fold('Udgang: nej'))).toEqual([]);
  });

  it('konstrueret: slem meldt uden dækning har spørgsmålene til slem uden dækning', () => {
    vis('#/spil/1', med({ slem: niveau('nej', 0, true, [{ farve: 'S', stik: 11 }]) }), PAR_3287_URL);
    expect(fold('Slem: nej').open).toBe(true);
    expect(spørgsmål(fold('Slem: nej'))).toEqual(SPØRG.slemUden);
  });

  it('konstrueret: konkurrence, hvor I ejede spillet, og en offermelding er bedst for modparten', () => {
    const ejer: Meldesamtale['ejer'] = {
      side: 'jer', konkurrence: true,
      trumf: { jer: { farve: 'S', kort: 9 }, modparten: { farve: 'H', kort: 9 } },
      bedst: { spilfoerer: 'jer', kontrakter: ['4S'] },
    };
    vis('#/spil/1', med({ ejer, overstikAfgoerende: false }), PAR_3287_URL);
    expect(linje('Var overstikket afgørende?')).toBe('Nej');
    expect(linje('Hvem ejede spillet?')).toBe(
      'I (konkurrence) Trumf: jer 9 spar, modparten 9 hjerter, i alt 18 (loven om totale stik). Bedst for jer: selv at spille 4♠.',
    );
  });

  it('konstrueret: par er pas, og overstikket kan ikke regnes ved pas', () => {
    const ejer: Meldesamtale['ejer'] = {
      side: null, konkurrence: false,
      trumf: { jer: { farve: 'S', kort: 7 }, modparten: { farve: 'H', kort: 7 } },
      bedst: { spilfoerer: null, kontrakter: [] },
    };
    vis('#/spil/1', med({ ejer, overstikAfgoerende: null }), PAR_3287_URL);
    expect(linje('Var overstikket afgørende?')).toBe('–');
    expect(linje('Hvem ejede spillet?')).toBe('Ingen (par er pas)');
  });
});

describe('Meldesamtalen ved holdturnering', () => {
  it('feltet er det andet bord', () => {
    const data = hold();
    const nr = data.spil.find((s) => s.spillet)!.nummer;
    vis(`#/spil/${nr}`, med({ udgang: niveau('ja', 1, true, [{ farve: 'NT', stik: 9 }], 1), slem: niveau('nej', 0, false, [{ farve: 'NT', stik: 9 }], 1) }, data, nr), HOLD_URL, vaelg());
    expect(felter().slice(1)).toEqual(['Udgang ✓ Ja det andet bord', 'Slem ✗ Nej ikke det andet bord']);
    expect(tekst(fold('Udgang: ja'))).toContain('Facit: 9 stik i sans med åbne kort; det andet bord meldte udgang.');
    expect(tekst(fold('Slem: nej'))).toContain('Facit: 9 stik i sans med åbne kort; det andet bord meldte ikke slem.');
  });
});

describe('Spørg hinanden', () => {
  it('spørgsmålene står kun i src/tekster.ts', () => {
    const src = join(process.cwd(), 'src');
    const filer = (mappe: string): string[] =>
      readdirSync(mappe).flatMap((n) => (statSync(join(mappe, n)).isDirectory() ? (n === 'test' ? [] : filer(join(mappe, n))) : [join(mappe, n)]));
    const alle = Object.values(SPØRG).flat();
    const tekster = readFileSync(join(src, 'tekster.ts'), 'utf8');
    for (const s of alle) expect(tekster, s).toContain(s);
    for (const fil of filer(src).filter((f) => /\.(tsx?|css)$/.test(f) && !f.endsWith('tekster.ts'))) {
      const indhold = readFileSync(fil, 'utf8');
      expect(alle.filter((s) => indhold.includes(s)), fil).toEqual([]);
    }
  });

  it('vises kun ved måske, fit "Nej" og meldt uden dækning på alle 32 spil den 16. november', () => {
    const data = par3287();
    for (const s of data.spil) {
      vis(`#/spil/${s.nummer}`, data, PAR_3287_URL);
      const m = (s as unknown as { meldesamtale: Meldesamtale }).meldesamtale;
      const ventet = [
        m.fit.svar === 'nej' ? SPØRG.fit : [],
        m.udgang.svar === 'maaske' ? SPØRG.udgangMåske : m.udgang.svar === 'nej' && m.udgang.meldt && !m.slem?.meldt ? SPØRG.udgangUden : [],
        m.slem?.svar === 'maaske' ? SPØRG.slemMåske : m.slem?.svar === 'nej' && m.slem.meldt ? SPØRG.slemUden : [],
      ].flat();
      const vist = [...kortet().querySelectorAll('details')].flatMap((d) => (d.open ? spørgsmål(d) : []));
      expect(vist.sort(), `spil ${s.nummer}`).toEqual([...ventet].sort());
      // Lukkede folder har ingen spørgsmål.
      expect([...kortet().querySelectorAll('details:not([open])')].flatMap(spørgsmål), `spil ${s.nummer}`).toEqual([]);
      cleanup();
    }
  });
});
