// @vitest-environment jsdom
// Accepttest 1, 4, 5 og 6 i SPEC-postmortem-1d-point.md (appens del), skrevet før bygningen: point og procent som
// bridge.dk, scoren, pointene og procenten for hvert spil på oversigten og ⓘ ved "Hvor gik pointene?". Accepttest 6 er
// udvidet efter Franks svar 17. nov. 2026: ⓘ også i analysevinduet og ved holdturnering, med Franks tekster.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Analyse } from '../typer';
import { hold, HOLD_URL, par, PAR_3287_URL, par3287, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

/** Testens egen talformatering med én decimal som bridge.dk: 0,05 rundes væk fra nul, og ",0" skrives ikke. */
const fmt1 = (n: number, fortegn = false) => {
  const r = Math.sign(n) * (Math.round(Math.abs(n) * 10 + 1e-9) / 10);
  return (r < 0 ? '−' : fortegn && r > 0 ? '+' : '') + String(Math.abs(r)).replace('.', ',');
};

const spilListe = () => within(screen.getByRole('list', { name: 'Spillene' })).queryAllByRole('link');
const INFO = 'Hjælp: Hvor gik pointene?';

// ⓘ-teksten ved parturnering (Franks svar 17. nov. 2026): forslaget i specen med Franks sætning om omregning.
const INFO_PAR = [
  'Point er parpoint. På hvert spil får I 2 point for hvert par i feltet, I slår, og 1 for hvert, I deler med. Er et spil spillet færre gange, omregnes pointene, så alle spil tæller lige meget, som hos bridge.dk. Middel er halvdelen af det mulige, altså 50 %. Tallene viser, hvor mange point I lå over eller under middel, og hvad der flyttede dem:',
  'Meldinger (begge sider): forskellen mellem den spillede kontrakt og det bedste, der kunne meldes med åbne kort.',
  'Spilføring og Modspil: stik, I tabte i forhold til åbne kort. De er nul eller negative.',
  'Held og uheld: resten, altså det, feltet gjorde anderledes, uden at I gjorde noget forkert. Modpartens fejl tæller med her.',
  'Summen er jeres point mod middel.',
];
const FEDE_PAR = ['Point', 'Middel', 'Meldinger (begge sider):', 'Spilføring', 'Modspil:', 'Held og uheld:'];
// ⓘ-teksten ved holdturnering, ordret som i Franks svar og godkendelse 17. nov. 2026.
const INFO_HOLD = [
  'Point er imp. På hvert spil lægges jeres score og holdkammeraternes score ved det andet bord sammen, og summen omregnes til imp. Tallene viser, hvor mange imp I vandt eller tabte, og hvad der flyttede dem: Meldinger, Spilføring og Modspil er regnet med åbne kort som ved parturnering. Held og uheld er resten, mest resultatet ved det andet bord, og holdkammeraternes fejl og gode spil tæller med her. Summen er jeres imp.',
];
const FEDE_HOLD = ['Point'];

describe('Accepttest 1 og 4: aftenen 16. november som bridge.dk', () => {
  it('resultatet er 50,4 % og 225,9 af 448 point', () => {
    vis('#/aften', par3287(), PAR_3287_URL);
    expect(tekst(document.querySelector('.resultat'))).toBe('Par 1 · 32 spil · 50,4 % (225,9 af 448 point)');
  });

  it('I alt mod middel er +1,9, og faktorerne står med én decimal', () => {
    vis('#/aften', par3287(), PAR_3287_URL);
    const a = par3287();
    const område = screen.getByRole('region', { name: 'Hvor gik pointene?' });
    const iAlt = within(område).getByText('I alt mod middel').closest('li')!;
    expect(tekst(iAlt)).toBe('I alt mod middel +1,9');
    for (const [nøgle, navn] of [['meldinger', 'Meldinger (begge sider)'], ['spilfoering', 'Spilføring'], ['modspil', 'Modspil'], ['held', 'Held og uheld']] as const) {
      expect(tekst(within(område).getByText(navn).closest('li'))).toBe(`${navn} ${fmt1(a.faktorer[nøgle], true)}`);
    }
  });

  it('spil 32, der er spillet 7 gange, har 5,9 point og 41,8 % i analysevinduet', () => {
    vis('#/spil/32', par3287(), PAR_3287_URL);
    expect(tekst(document.querySelector('.point-linje'))).toBe('5,9 af 14 point 41,8 %');
  });
});

describe.each([
  ['16. november', par3287, PAR_3287_URL],
  ['4. november', par, undefined],
] as const)('Accepttest 5: scoren, pointene og procenten for hvert spil, %s', (_navn, data, url) => {
  it('hver række viser score, point og procent', () => {
    vis('#/aften', data(), url);
    const a = data();
    const links = spilListe();
    expect(links).toHaveLength(a.spil.length);
    for (const [i, s] of a.spil.entries()) {
      const t = tekst(links[i]);
      expect(t, `spil ${s.nummer}`).toContain(fmt1(s.score!, true));
      const resultat = tekst(links[i].querySelector('.spil-resultat'));
      expect(resultat, `spil ${s.nummer}`).toBe(`${fmt1(s.procent!)} % ${fmt1(s.point!)} point`);
    }
  });
});

describe('Accepttest 5: en justeret score ved jeres bord', () => {
  it('rækken viser Justeret score med bridge.dk\'s point og procent', () => {
    const a: Analyse = par3287();
    const s = a.spil[4];
    Object.assign(s, { spillet: false, kontrakt: null, spilfoerer: null, udspil: null, stik: null, score: null, point: 8, top: 14, procent: 57.1, faktorer: null });
    vis('#/aften', a, PAR_3287_URL);
    const række = spilListe()[4];
    expect(tekst(række.querySelector('.spil-linje'))).toBe('Justeret score');
    expect(tekst(række.querySelector('.spil-resultat'))).toBe('57,1 % 8 point');
  });
});

// Accepttest 6 efter Franks svar 17. nov. 2026: ⓘ står fire steder, på oversigten og i analysevinduet ved parturnering
// og ved holdturnering. Enter og mellemrum prøves i en rigtig browser (tools/tjek_bredde.mjs), fordi jsdom ikke lader
// dem klikke på en knap.
const STEDER = [
  ['oversigten ved parturnering, 16. november', '#/aften', par3287, PAR_3287_URL, undefined, INFO_PAR, FEDE_PAR],
  ['oversigten ved parturnering, 4. november', '#/aften', par, undefined, undefined, INFO_PAR, FEDE_PAR],
  ['analysevinduet ved parturnering, spil 32', '#/spil/32', par3287, PAR_3287_URL, undefined, INFO_PAR, FEDE_PAR],
  ['oversigten ved holdturnering', '#/aften', hold, HOLD_URL, vaelg, INFO_HOLD, FEDE_HOLD],
  ['analysevinduet ved holdturnering, spil 4', '#/spil/4', hold, HOLD_URL, vaelg, INFO_HOLD, FEDE_HOLD],
] as const;

describe.each(STEDER)('Accepttest 6: ⓘ ved "Hvor gik pointene?", %s', (_navn, hash, data, url, liste, forventet, fede) => {
  const visHer = () => vis(hash, data(), url, liste?.());
  const åben = () => {
    const knap = screen.getByRole('button', { name: INFO });
    return { knap, panel: document.getElementById(knap.getAttribute('aria-controls') ?? '') };
  };

  it('står ved overskriften og har Franks tekst', () => {
    visHer();
    const område = screen.getByRole('region', { name: 'Hvor gik pointene?' });
    const knap = within(område).getByRole('button', { name: INFO });
    expect(knap.tagName).toBe('BUTTON');
    expect(knap.getAttribute('type')).toBe('button');
    expect(knap.getAttribute('aria-expanded')).toBe('false');
    expect(åben().panel).toBeNull();
    fireEvent.click(knap);
    const { panel } = åben();
    expect(knap.getAttribute('aria-expanded')).toBe('true');
    expect(panel).not.toBeNull();
    expect(område.contains(panel)).toBe(true);
    const dele = [...panel!.querySelectorAll('p, li')].map(tekst);
    expect(dele).toEqual(forventet);
    expect([...panel!.querySelectorAll('strong')].map(tekst)).toEqual(fede);
  });

  it('åbner og lukker med et klik eller tryk', () => {
    visHer();
    const { knap } = åben();
    fireEvent.pointerDown(knap, { pointerType: 'touch' });
    fireEvent.click(knap);
    expect(knap.getAttribute('aria-expanded')).toBe('true');
    expect(åben().panel).not.toBeNull();
    fireEvent.pointerDown(knap, { pointerType: 'mouse' });
    fireEvent.click(knap);
    expect(knap.getAttribute('aria-expanded')).toBe('false');
    expect(åben().panel).toBeNull();
  });

  it('lukker med Escape, og fokus bliver på ⓘ', () => {
    visHer();
    const { knap } = åben();
    knap.focus();
    fireEvent.click(knap);
    expect(knap.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(knap.getAttribute('aria-expanded')).toBe('false');
    expect(åben().panel).toBeNull();
    expect(document.activeElement).toBe(knap);
  });
});

describe.each([
  ['parturnering, 16. november', par3287, PAR_3287_URL, undefined, INFO_PAR[0]],
  ['holdturnering', hold, HOLD_URL, vaelg, INFO_HOLD[0]],
] as const)('Accepttest 6: ⓘ i analysevinduet for hvert spil, %s', (_navn, data, url, liste, første) => {
  it('står ved "Hvor gik pointene?" på hvert spil, der har faktorer', () => {
    const a = data();
    expect(a.spil.some((s) => s.spillet && s.faktorer)).toBe(true);
    for (const s of a.spil) {
      vis(`#/spil/${s.nummer}`, data(), url, liste?.());
      const område = screen.queryByRole('region', { name: 'Hvor gik pointene?' });
      if (s.spillet && s.faktorer) {
        expect(område, `spil ${s.nummer}`).not.toBeNull();
        const knap = within(område!).getByRole('button', { name: INFO });
        fireEvent.click(knap);
        expect(tekst(document.getElementById(knap.getAttribute('aria-controls')!)!.querySelector('p')), `spil ${s.nummer}`).toBe(første);
      } else {
        expect(screen.queryByRole('button', { name: INFO }), `spil ${s.nummer}`).toBeNull();
      }
      cleanup();
    }
  });
});
