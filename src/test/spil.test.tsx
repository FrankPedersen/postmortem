// @vitest-environment jsdom
// Accepttest 4 (SPEC-postmortem-1c-app.md): analysevinduet for spil 7 i turnering 452.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Plads } from '../typer';
import { farve, hold, HOLD_URL, ikkeSpillet, par, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

const fmt = (n: number, fortegn = false) =>
  (n < 0 ? '−' : fortegn && n > 0 ? '+' : '') + String(Math.abs(n)).replace('.', ',');
const PLADSER: [Plads, string][] = [['N', 'Nord'], ['E', 'Øst'], ['S', 'Syd'], ['W', 'Vest']];
const SYMBOL = ['♠', '♥', '♦', '♣'];
const spil7 = () => par().spil.find((s) => s.nummer === 7)!;

describe('Analysevinduet, spil 7 i 452', () => {
  it('bordet er en figure med de fire hænder som i svaret', () => {
    vis('#/spil/7', par());
    const s = spil7();
    const bordet = screen.getByRole('figure', { name: /^Bordet/ });
    for (const [plads, navn] of PLADSER) {
      const hånd = bordet.querySelector(`[data-plads="${plads}"]`)!;
      expect(tekst(hånd.querySelector('.plads-navn'))).toMatch(new RegExp(`^${navn} · \\d+ hp`));
      const farver = s.haender[plads].split('.');
      expect([...hånd.querySelectorAll('.farve')].map(tekst)).toEqual(farver.map((k, i) => `${SYMBOL[i]} ${farve(k) || '—'}`));
    }
    expect(tekst(bordet.querySelector('[data-plads="S"] .plads-navn'))).toContain('spilfører');
    expect(tekst(bordet.querySelector('.kompas'))).toContain('2NT · Syd');
    expect(tekst(bordet.querySelector('.kompas'))).toContain('udspil ♥3');
    // Skærmlæseren får hænderne i figurens navn.
    expect(bordet.getAttribute('aria-label')).toContain('Nord: spar B 8 4, hjerter E 8, ruder 9 5 4 3, klør B 9 8 7');
  });

  it('DD-tabellen står som i svaret, med kontraktens felt fremhævet', () => {
    vis('#/spil/7', par());
    const s = spil7();
    const tabel = screen.getByRole('table', { name: 'Stik med åbne kort' });
    const rækker = within(tabel).getAllByRole('row');
    expect(rækker.slice(1).map((r) => tekst(r.querySelector('th')))).toEqual(['N', 'S', 'Ø', 'V']);
    for (const [i, plads] of (['N', 'S', 'E', 'W'] as Plads[]).entries()) {
      const tal = [...rækker[i + 1].querySelectorAll('td')].map(tekst);
      expect(tal).toEqual((['C', 'D', 'H', 'S', 'NT'] as const).map((b) => String(s.ddTabel[plads][b])));
    }
    const fremhævet = tabel.querySelectorAll('td.kontrakt');
    expect(fremhævet).toHaveLength(1);
    expect(tekst(fremhævet[0])).toBe(String(s.ddTabel.S.NT));
    const dd = tekst(screen.getByRole('region', { name: 'Dobbeltdummy' }));
    expect(dd).toContain('Par N–S 1NT +1, +120');
    expect(dd).toContain('Max før udspil 8 stik');
    // Udspillet ♥3 sidder ikke hos udspilleren, så max efter udspil er ukendt (udspilseffekt.ukendt).
    expect(dd).toContain('Max efter udspil ukendt udspil');
  });

  it('Ved jeres bord og feltets scorer står som i svaret, med jeres række fremhævet', () => {
    vis('#/spil/7', par());
    const s = spil7();
    const bord = screen.getByRole('region', { name: 'Ved jeres bord' });
    expect(tekst(bord)).toContain('Kontrakt S 2NT');
    expect(tekst(bord)).toContain('Udspil ♥3');
    expect(tekst(bord)).toContain('Stik 8');
    expect(tekst(bord)).toContain('Score +120');
    expect(tekst(bord)).toContain('11 af 14 point 78,6 %');
    const felt = within(bord).getByRole('list', { name: 'Feltet' });
    const alle = [...s.felt, s.score!].sort((a, b) => b - a);
    const grupper = [...new Set(alle)].map((v) => `${fmt(v, true)} ×${alle.filter((x) => x === v).length}`);
    const rækker = within(felt).getAllByRole('listitem');
    expect(rækker.map((r) => tekst(r).replace(' (jer)', ''))).toEqual(grupper);
    const jer = rækker.filter((r) => tekst(r).includes('(jer)'));
    expect(jer).toHaveLength(1);
    expect(tekst(jer[0])).toBe('+120 (jer) ×2');
    expect(jer[0].classList.contains('jer')).toBe(true);
  });

  it('de fire faktorer for spillet står med en linje tekst hver', () => {
    vis('#/spil/7', par());
    const s = spil7();
    const område = screen.getByRole('region', { name: 'Hvor gik pointene?' });
    const rækker = within(område).getAllByRole('listitem');
    expect(rækker.map((r) => tekst(r.querySelector('.navn')))).toEqual(['Meldinger', 'Spilføring', 'Modspil', 'Held og uheld']);
    expect(tekst(rækker[0].querySelector('.vaerdi'))).toBe(fmt(s.faktorer!.meldinger, true));
    expect(tekst(rækker[1].querySelector('.vaerdi'))).toBe(fmt(s.faktorer!.spilfoering, true));
    expect(tekst(rækker[2].querySelector('.vaerdi'))).toBe('–');
    expect(tekst(rækker[3].querySelector('.vaerdi'))).toBe(fmt(s.faktorer!.held, true));
    // Udspillet er ukendt, så linjen bruger max før udspil.
    expect(tekst(rækker[1].querySelector('.linje'))).toBe('8 stik kunne tages med åbne kort; I tog 8.');
    expect(tekst(rækker[2].querySelector('.linje'))).toBe('I var spilfører.');
    for (const r of rækker) expect(tekst(r.querySelector('.linje')).length).toBeGreaterThan(5);
  });

  it('forrige og næste spil virker', async () => {
    vis('#/spil/7', par());
    expect(screen.getByRole('link', { name: 'Forrige spil' }).getAttribute('href')).toBe('#/spil/6');
    fireEvent.click(screen.getByRole('link', { name: 'Næste spil' }));
    expect(tekst(await screen.findByRole('heading', { level: 1, name: 'Spil 8' }))).toBe('Spil 8');
    expect(screen.getByRole('link', { name: 'Næste spil' }).getAttribute('href')).toBe('#/spil/9');
    expect(screen.getByRole('link', { name: 'Tilbage til oversigten' }).getAttribute('href')).toBe('#/aften');
  });

  it('første og sidste spil har kun den ene vej', () => {
    vis('#/spil/1', par());
    expect(screen.queryByRole('link', { name: 'Forrige spil' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Næste spil' })).toBeTruthy();
    cleanup();
    vis('#/spil/32', par());
    expect(screen.queryByRole('link', { name: 'Næste spil' })).toBeNull();
  });

  it('spillet: false viser bordet, DD-tabellen og "Ikke spillet ved jeres bord"', () => {
    const a = par();
    a.spil = a.spil.map((s) => (s.nummer === 7 ? ikkeSpillet(s) : s));
    vis('#/spil/7', a);
    expect(screen.getByRole('figure', { name: /^Bordet/ })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Stik med åbne kort' })).toBeTruthy();
    expect(screen.getAllByText('Ikke spillet ved jeres bord').length).toBeGreaterThan(0);
    expect(screen.queryByRole('list', { name: 'Feltet' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Hvor gik pointene?' })).toBeNull();
    expect(tekst(screen.getByRole('table', { name: 'Stik med åbne kort' }).querySelector('td.kontrakt'))).toBe('');
  });

  it('spillet: false står også rigtigt i aftenens liste', () => {
    const a = par();
    a.spil = a.spil.map((s) => (s.nummer === 7 ? ikkeSpillet(s) : s));
    vis('#/aften', a);
    const link = within(screen.getByRole('list', { name: 'Spillene' })).getAllByRole('link')[6];
    expect(tekst(link)).toContain('Ikke spillet ved jeres bord');
  });
});

describe('Analysevinduet i holdturnering', () => {
  it('viser imp mod jeres andet bord og holdkammeraternes score', () => {
    vis('#/spil/1', hold(), HOLD_URL, vaelg());
    const s = hold().spil[0];
    const bord = tekst(screen.getByRole('region', { name: 'Ved jeres bord' }));
    expect(bord).toContain(`Imp mod jeres andet bord ${fmt(s.point!, true)}`);
    expect(bord).toContain(`Jeres andet bord: ${fmt(s.holdkammerater!, true)}`);
  });
});
