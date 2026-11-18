// @vitest-environment jsdom
// Accepttest 1, 3 og 6 i SPEC-postmortem-2a-vaerd-at-se-paa.md, skrevet før bygningen: kortet "Spil værd at se på" på
// aftenens oversigt for 16. november (Franks svar 2, 17. nov. 2026), knappen "Vis alle (18)", linjen med de uheldige,
// "Hvorfor er et spil med?" og filteret "Værd at se på · 8" over Spillene. Testen skriver hele listen, så Frank kan se den.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hold, HOLD_URL, PAR_3287_URL, par3287, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

// Listen under Afklaret ("Franks svar 2"): spillet, linjen og mærkerne, som de står på skærmen.
const DE_8: [number, string, string, string[]][] = [
  [1, 'N 4♠ · 11 stik · +450', '28,6 %', ['Slem misset', 'Meldinger −14 point', 'Anden kontrakt end feltet']],
  [4, 'N 3NT · 9 stik · +600', '71,4 %', ['Heldigt: godt resultat, meldinger −10 point, anden kontrakt end feltet']],
  [8, 'Ø 3♥ · 10 stik · −170', '21,4 %', ['Bund', 'Modspil −2 stik']],
  [25, 'Ø 3♠ · 9 stik · −140', '7,1 %', ['Bund', 'Meldinger −1 point', 'Modspil −1 stik', 'Anden kontrakt end feltet']],
  [29, 'N 2♠ · 7 stik · −100', '42,9 %', ['Meldinger −4 point', 'Spilføring −1 stik', 'Anden kontrakt end feltet']],
  [6, 'N 3♠ · 10 stik · +170', '42,9 %', ['Udgang misset', 'Meldinger −7 point']],
  [24, 'Ø 2♠ · 10 stik · −170', '14,3 %', ['Bund', 'Meldinger −2 point', 'Modspil −2 stik', 'Anden kontrakt end feltet']],
  [9, 'Ø 3NT · 9 stik · −600', '42,9 %', ['Modspil −1 stik']],
];
const RESTEN: [number, string[]][] = [
  [5, ['Heldigt: godt resultat, meldinger −2 point, spilføring −1 stik']],
  [21, ['Heldigt: godt resultat, udgang misset, meldinger −6 point']],
  [14, ['Udspillet kostede 1 stik', 'Anden kontrakt end feltet']],
  [11, ['Heldigt: top, udgang meldt uden dækning, meldinger −5 point']],
  [13, ['Heldigt: godt resultat, udgang misset, meldinger −2 point, spilføring −1 stik']],
  [32, ['Meldinger −2,3 point']],
  [17, ['Bund', 'Udgang meldt uden dækning', 'Strafdobling', 'Meldinger −2 point', 'Anden kontrakt end feltet']],
  [18, ['Heldigt: top, udgang misset, meldinger −2 point, anden kontrakt end feltet']],
  [22, ['Heldigt: top, udspillet kostede 1 stik']],
  [19, ['Heldigt: top, udspillet kostede 1 stik, anden kontrakt end feltet']],
];
// Kun bund, under 25 % (Franks svar 3, 18. nov. 2026): spil 26 og 27 (42,9 %) er ikke med.
const UHELDIGE = 'Uheldige, ingen fejl: spil 15 og 20';

const kortet = () => screen.getByRole('region', { name: 'Spil værd at se på' });
const listen = () => within(kortet()).getByRole('list', { name: 'Spil værd at se på' });
const rækker = () => within(listen()).getAllByRole('link');
const nummer = (a: Element) => Number(a.getAttribute('href')!.replace('#/spil/', ''));
const mærker = (a: Element) => [...a.querySelectorAll('.vaerd-maerke')].map(tekst);

describe('Spil værd at se på, 16. november', () => {
  const vísAften = () => vis('#/aften', par3287(), PAR_3287_URL);

  it('viser de 8 spil med størst omkostning i rækkefølge, med linje, procent og mærker', () => {
    vísAften();
    expect(tekst(within(kortet()).getByText(/af 32$/))).toBe('8 af 32');
    const r = rækker();
    expect(r.map(nummer)).toEqual(DE_8.map(([n]) => n));
    for (const [i, [n, linje, procent, m]] of DE_8.entries()) {
      expect(r[i].getAttribute('href')).toBe(`#/spil/${n}`);
      expect(tekst(r[i].querySelector('.vaerd-linje')), `spil ${n}`).toBe(linje);
      expect(tekst(r[i].querySelector('.vaerd-procent')), `spil ${n}`).toBe(procent);
      expect(mærker(r[i]), `spil ${n}`).toEqual(m);
    }
    // Teksten under overskriften står i beskrivende form (husets regel), ikke "Bedøm beslutningen".
    expect(tekst(kortet())).toContain('Beslutningen bedømmes, ikke kun resultatet.');
  });

  it('"Vis alle (18)" viser resten i rækkefølge, og knappen lukker igen', () => {
    vísAften();
    const knap = within(kortet()).getByRole('button', { name: 'Vis alle (18)' });
    expect(knap.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(knap);
    expect(knap.getAttribute('aria-expanded')).toBe('true');
    expect(tekst(within(kortet()).getByText(/af 32$/))).toBe('18 af 32');
    const r = rækker();
    expect(r.map(nummer)).toEqual([...DE_8.map(([n]) => n), ...RESTEN.map(([n]) => n)]);
    for (const [i, [n, m]] of RESTEN.entries()) expect(mærker(r[8 + i]), `spil ${n}`).toEqual(m);
    fireEvent.click(within(kortet()).getByRole('button', { name: 'Vis færre' }));
    expect(rækker()).toHaveLength(8);
  });

  it('spil 7 er hverken blandt de 8 eller under "Vis alle"', () => {
    vísAften();
    fireEvent.click(within(kortet()).getByRole('button', { name: 'Vis alle (18)' }));
    expect(rækker().map(nummer)).not.toContain(7);
  });

  it('de uheldige står på én linje under listen med et link til hvert spil', () => {
    vísAften();
    const linje = within(kortet()).getByText(/^Uheldige, ingen fejl/).closest('p')!;
    expect(tekst(linje)).toBe(UHELDIGE);
    expect(within(linje).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/spil/15', '#/spil/20']);
    expect(rækker().map(nummer)).not.toContain(15);
    // Spil 26 og 27 (42,9 %) er ikke bund og står hverken på linjen eller i listen.
    fireEvent.click(within(kortet()).getByRole('button', { name: 'Vis alle (18)' }));
    expect(rækker().map(nummer).filter((n) => n === 26 || n === 27)).toEqual([]);
  });

  it('"Hvorfor er et spil med?" har listens regel og siger, at bund, top og anden kontrakt end feltet kun er ekstra mærker', () => {
    vísAften();
    const forklaring = within(kortet()).getByText('Hvorfor er et spil med?').closest('details')!;
    expect(forklaring.open).toBe(false);
    const t = tekst(forklaring);
    expect(t).toContain('de 8 spil');
    expect(t).toContain('2 point');
    expect(t).toContain('Bund, top og anden kontrakt end feltet er kun ekstra mærker');
    expect(t).toContain('Uheldige spil, bund (under 25 %) uden egne fejl, står på én linje under listen.');
  });

  it('filteret "Værd at se på · 8" viser de 8 i spillenes rækkefølge', () => {
    vísAften();
    const filter = screen.getByRole('button', { name: 'Værd at se på · 8' });
    fireEvent.click(filter);
    expect(filter.getAttribute('aria-pressed')).toBe('true');
    const spillene = within(screen.getByRole('list', { name: 'Spillene' })).getAllByRole('link');
    expect(spillene.map(nummer)).toEqual([...DE_8.map(([n]) => n)].sort((a, b) => a - b));
  });

  it('skriver hele listen, så Frank kan se den', () => {
    vísAften();
    fireEvent.click(within(kortet()).getByRole('button', { name: 'Vis alle (18)' }));
    const linjer = rækker().map((a, i) => `${String(i + 1).padStart(2)}. spil ${String(nummer(a)).padStart(2)}  ${tekst(a.querySelector('.vaerd-linje'))}  ${tekst(a.querySelector('.vaerd-procent'))}  ${mærker(a).join(' · ')}`);
    console.log(['Spil værd at se på, 16. november 2026 (de 8 og "Vis alle (18)"):', ...linjer, UHELDIGE].join('\n'));
    expect(linjer).toHaveLength(18);
  });
});

describe('Spil værd at se på ved holdturnering (450, bord 2 Nord–Syd)', () => {
  it('har hverken bund eller top, og meldinger står i imp', () => {
    vis('#/aften', hold(), HOLD_URL, vaelg());
    fireEvent.click(within(kortet()).queryByRole('button', { name: /^Vis alle/ }) ?? document.body);
    const alle = rækker().flatMap(mærker);
    expect(alle.length).toBeGreaterThan(0);
    expect(alle.filter((m) => /^(Bund|Top)$/.test(m) || /: (bund|top)\b/.test(m))).toEqual([]);
    expect(alle.filter((m) => /^Meldinger/.test(m)).every((m) => / imp$/.test(m))).toBe(true);
    for (const a of rækker()) expect(tekst(a.querySelector('.vaerd-procent'))).toMatch(/^([+−]\d+|0) imp$/);
  });
});
