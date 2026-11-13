// @vitest-environment jsdom
// Accepttest 5 (SPEC-postmortem-1c-app.md): tal med komma og "−", ingen engelske ord, og husets ord og beskrivende form
// (../CLAUDE.md) i al tekst, appen viser.
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dato, kontrakt, kort, medFortegn, tal } from '../format';
import { bydeform } from '../sprog/bydeform';
import { fund } from '../sprog/fagord';
import { T } from '../tekster';
import { falskFetch, hold, HOLD_URL, par, svar, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Al tekst på skærmen, som en læser kan se eller høre: tekstknuder, aria-label, placeholder og title. */
function skærmtekster(): string[] {
  const ud: string[] = [];
  const gå = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = gå.nextNode(); n; n = gå.nextNode()) if (n.textContent!.trim()) ud.push(n.textContent!.trim());
  for (const e of document.body.querySelectorAll('[aria-label], [placeholder], [title]')) {
    for (const a of ['aria-label', 'placeholder', 'title']) if (e.getAttribute(a)) ud.push(e.getAttribute(a)!);
  }
  // Turneringens navn kommer fra bridge.dk og er ikke appens tekst.
  const navne = [par().turnering.navn, hold().turnering.navn, hold().turnering.titel];
  return ud.filter((t) => !navne.includes(t));
}

/** Teksterne på alle skærme med begge testsvar: start, valg af hold, aftenen og hvert spil. */
async function alleSkærme(): Promise<string[]> {
  const ud: string[] = [];
  vis('#/');
  ud.push(...skærmtekster());
  cleanup();
  falskFetch(svar(200, vaelg()));
  vis('#/');
  fireEvent.change(screen.getByLabelText('Link til resultatsiden'), { target: { value: HOLD_URL } });
  fireEvent.click(screen.getByRole('button', { name: 'Analysér' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Hold 1' }));
  await screen.findByRole('heading', { name: 'Sad I Nord–Syd eller Øst–Vest?' });
  ud.push(...skærmtekster());
  cleanup();
  for (const [data, url, liste] of [[par(), undefined, undefined], [hold(), HOLD_URL, vaelg()]] as const) {
    vis('#/aften', data, url, liste);
    ud.push(...skærmtekster());
    cleanup();
    for (const s of data.spil) {
      vis(`#/spil/${s.nummer}`, data, url, liste);
      ud.push(...skærmtekster());
      cleanup();
    }
  }
  return [...new Set(ud)];
}

/** Alle strenge i tekster.ts. */
function strenge(x: unknown): string[] {
  if (typeof x === 'string') return [x];
  if (Array.isArray(x)) return x.flatMap(strenge);
  if (x && typeof x === 'object') return Object.values(x).flatMap(strenge);
  return [];
}

const ENGELSK =
  /\b(the|and|of|board|boards|trick|tricks|lead|declarer|defen[cs]e|bidding|luck|results?|teams?|pairs?|error|loading|back|next|previous|contract|vulnerable|dealer|none|both|north|south|east|west|points|played|analysis)\b/i;

describe('Tal', () => {
  it('skrives med komma som decimaltegn og − som minus', () => {
    expect(tal(62.28)).toBe('62,28');
    expect(tal(-15)).toBe('−15');
    expect(tal(0)).toBe('0');
    expect(medFortegn(23)).toBe('+23');
    expect(medFortegn(-2)).toBe('−2');
    expect(medFortegn(10.5)).toBe('+10,5');
    expect(medFortegn(0)).toBe('0');
    expect(medFortegn(0.1 + 0.2)).toBe('+0,3');
  });

  it('kort, kontrakter og datoer skrives på dansk', () => {
    expect(kort('CJ')).toBe('♣B');
    expect(kort('HT')).toBe('♥10');
    expect(kort('SA')).toBe('♠E');
    expect(kort('DQ')).toBe('♦D');
    expect(kontrakt('4S')).toBe('4♠');
    expect(kontrakt('3NTX')).toBe('3NT D');
    expect(kontrakt('5DXX')).toBe('5♦ RD');
    expect(kontrakt('Pas')).toBe('Pas');
    expect(dato('2026-11-04')).toBe('4. november 2026');
  });

  it('ingen tal på skærmen har punktum som decimaltegn eller bindestreg som minus', { timeout: 60_000 }, async () => {
    // Licensens navn "Apache 2.0" er ikke et tal.
    const tekster = (await alleSkærme()).map((t) => t.replace('Apache 2.0', 'Apache'));
    expect(tekster.filter((t) => /\b\d+\.\d{1,2}\b(?!\.)/.test(t))).toEqual([]);
    expect(tekster.filter((t) => /(^|[\s(+])-\d/.test(t))).toEqual([]);
    expect(tekster.some((t) => t.includes('−'))).toBe(true);
    expect(tekster.some((t) => /\d,\d/.test(t))).toBe(true);
  });
});

describe('Sprog', () => {
  it('ingen engelske ord og ingen koder fra svaret i teksterne', { timeout: 60_000 }, async () => {
    const tekster = [...(await alleSkærme()), ...strenge(T)];
    expect(tekster.filter((t) => ENGELSK.test(t))).toEqual([]);
    expect(tekster.filter((t) => /\b(NS|EW|OV|None|All)\b|^[EW] \d/.test(t))).toEqual([]);
  });

  it('husets ord og beskrivende form i al tekst', { timeout: 60_000 }, async () => {
    const tekster = [...(await alleSkærme()), ...strenge(T)];
    expect(tekster.flatMap(fund)).toEqual([]);
    expect(tekster.flatMap(bydeform)).toEqual([]);
  });

  it('testene fanger bydeform og husets "Ikke"-ord', () => {
    expect(bydeform('Indsæt linket, og se, hvor pointene gik tabt.')).toEqual(['Indsæt linket, og se, hvor pointene gik tabt.']);
    expect(bydeform('Kopiér hele adressen.')).toHaveLength(1);
    expect(bydeform('Analysér')).toEqual([]);
    expect(bydeform('Hold 1 · bord 2')).toEqual([]);
    expect(fund('Spilfører kunne have taget en knibning mod blindemand.')).toHaveLength(2);
    expect(fund('Et indspil i trumf.')).toHaveLength(1);
  });
});
