// @vitest-environment jsdom
// Accepttest for del B (SPEC-postmortem-1b-maerker.md): aftenens oversigt med kortet "Teknikker i aftenens spil",
// filtrene "Skvis · n" og "Indspil · n" og mærkerne i spillisten. Skrevet før appen blev ændret.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Analyse } from '../typer';
import { hold, HOLD_URL, par, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

const spilListe = () => within(screen.getByRole('list', { name: 'Spillene' })).queryAllByRole('link');
const kortet = () => screen.getByRole('region', { name: 'Teknikker i aftenens spil' });
const viSpillede = (s: Analyse['spil'][number]) => s.spilfoerer !== null && (s.retning === 'NS') === (s.spilfoerer === 'N' || s.spilfoerer === 'S');

describe('Testsvarene', () => {
  it('har de nye felter fra funktionen (SVAR.md, vindue 1b)', () => {
    for (const a of [par(), hold()]) {
      expect(Object.keys(a.teknikker!).sort()).toEqual(['indspil', 'skvis', 'spilfoerer']);
      for (const s of a.spil) {
        expect(s.teknik!.beregnet).toBe(true);
        expect(s.linje).toHaveLength(13);
        expect(s.raad!.udspil.bedste.length).toBeGreaterThan(0);
        expect(s.maerker.every((m) => m === 'skvis' || m === 'indspil')).toBe(true);
      }
    }
    // De tre mærker fra Afklaret: 452 spil 3 (skvis), 452 spil 18 (indspil) og 450 spil 9 (indspil mod holdet).
    expect(par().spil.filter((s) => s.maerker.length).map((s) => [s.nummer, s.maerker])).toEqual([[3, ['skvis']], [18, ['indspil']]]);
    expect(hold().spil.filter((s) => s.maerker.length).map((s) => [s.nummer, s.maerker])).toEqual([[9, ['indspil']]]);
  });
});

describe('Teknikker i aftenens spil', () => {
  it('452: kortet viser Skvis 1 og Indspil 1 og linjen "Taget ved jeres bord: 2 af 2"', () => {
    vis('#/aften', par());
    const k = kortet();
    expect(tekst(within(k).getByText('Skvis').closest('li'))).toBe('Skvis 1');
    expect(tekst(within(k).getByText('Indspil').closest('li'))).toBe('Indspil 1');
    // Parret var spilfører i begge spil og tog DD-stikkene i begge.
    const a = par();
    const egne = a.spil.filter((s) => s.maerker.length && viSpillede(s));
    const taget = egne.filter((s) => s.maerker.every((m) => s.stik! >= s.teknik![m]!.medTeknik));
    expect([taget.length, egne.length]).toEqual([2, 2]);
    expect(tekst(within(k).getByText('Taget ved jeres bord').closest('li'))).toBe('Taget ved jeres bord 2 af 2');
    expect(tekst(k)).toContain('mulige med åbne kort');
    expect(tekst(k)).toContain('de sidste seks stik');
  });

  it('450: Skvis 0 og Indspil 1; linjen om jeres bord står der ikke, når holdet ikke var spilfører i spillet', () => {
    vis('#/aften', hold(), HOLD_URL, vaelg());
    const k = kortet();
    expect(tekst(within(k).getByText('Skvis').closest('li'))).toBe('Skvis 0');
    expect(tekst(within(k).getByText('Indspil').closest('li'))).toBe('Indspil 1');
    expect(within(k).queryByText('Taget ved jeres bord')).toBeNull();
  });

  it('uden mærker siger kortet, at ingen spil krævede en teknik', () => {
    const a = par();
    for (const s of a.spil) {
      s.maerker = [];
      s.teknik = { ...s.teknik!, skvis: null, indspil: null, kastIndSkvis: false };
    }
    a.teknikker = { ...a.teknikker!, skvis: { spil: 0, somSpilfoerer: 0, taget: 0 }, indspil: { spil: 0, somSpilfoerer: 0, taget: 0 } };
    vis('#/aften', a);
    expect(tekst(kortet())).toContain('Ingen af aftenens spil krævede en skvis eller et indspil i de sidste seks stik.');
    expect((screen.getByRole('button', { name: 'Skvis · 0' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Indspil · 0' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('kortet står mellem faktorerne og spillene', () => {
    vis('#/aften', par());
    const overskrifter = screen.getAllByRole('heading', { level: 2 }).map(tekst);
    expect(overskrifter.slice(0, 3)).toEqual(['Hvor gik pointene?', 'Teknikker i aftenens spil', 'Spillene']);
  });
});

describe('Filtrene', () => {
  it('står i rækkefølgen Alle, Skvis, Indspil og Tabte point med antal', () => {
    vis('#/aften', par());
    const knapper = within(screen.getByRole('group', { name: 'Filter' })).getAllByRole('button').map(tekst);
    expect(knapper.slice(0, 3)).toEqual(['Alle 32', 'Skvis · 1', 'Indspil · 1']);
    expect(knapper[3]).toMatch(/^Tabte point · \d+$/);
  });

  it('"Skvis · 1" og "Indspil · 1" viser kun spillene med mærket, og Alle viser dem igen', () => {
    vis('#/aften', par());
    const skvis = screen.getByRole('button', { name: 'Skvis · 1' });
    const indspil = screen.getByRole('button', { name: 'Indspil · 1' });
    fireEvent.click(skvis);
    expect(skvis.getAttribute('aria-pressed')).toBe('true');
    expect(spilListe().map((l) => l.getAttribute('href'))).toEqual(['#/spil/3']);
    fireEvent.click(indspil);
    expect(skvis.getAttribute('aria-pressed')).toBe('false');
    expect(indspil.getAttribute('aria-pressed')).toBe('true');
    expect(spilListe().map((l) => l.getAttribute('href'))).toEqual(['#/spil/18']);
    fireEvent.click(screen.getByRole('button', { name: 'Alle 32' }));
    expect(spilListe()).toHaveLength(32);
  });

  it('450: "Skvis · 0" kan ikke vælges, og "Indspil · 1" viser spil 9', () => {
    vis('#/aften', hold(), HOLD_URL, vaelg());
    expect((screen.getByRole('button', { name: 'Skvis · 0' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Indspil · 1' }));
    expect(spilListe().map((l) => l.getAttribute('href'))).toEqual(['#/spil/9']);
  });
});

describe('Mærkerne i spillisten', () => {
  const teknikMærker = (link: Element) => [...link.querySelectorAll('.teknik-maerke')].map(tekst);

  it('452: spil 3 har "Skvis mulig" og spil 18 "Indspil muligt"; de andre spil har intet teknikmærke', () => {
    vis('#/aften', par());
    const links = spilListe();
    for (const [i, s] of par().spil.entries()) {
      const ventet = s.nummer === 3 ? ['Skvis mulig'] : s.nummer === 18 ? ['Indspil muligt'] : [];
      expect(teknikMærker(links[i]), `spil ${s.nummer}`).toEqual(ventet);
      // Mærket fra vindue 1c (spillets mest negative faktor) står der stadig, én gang.
      expect(links[i].querySelectorAll('.maerke')).toHaveLength(1);
    }
  });

  it('450: spil 9 har "Indspil muligt mod jer", fordi holdet var i modspil', () => {
    vis('#/aften', hold(), HOLD_URL, vaelg());
    const s = hold().spil.find((x) => x.nummer === 9)!;
    expect(viSpillede(s)).toBe(false);
    const links = spilListe();
    expect(teknikMærker(links[8])).toEqual(['Indspil muligt mod jer']);
    expect(links.flatMap(teknikMærker)).toEqual(['Indspil muligt mod jer']);
  });

  it('en skvis mod parret hedder "Skvis mulig mod jer"', () => {
    // Samme spil set fra den anden side: parret sidder Øst–Vest, og Nord er stadig spilfører.
    const a = par();
    const s = a.spil.find((x) => x.nummer === 3)!;
    s.retning = 'OV';
    vis('#/aften', a);
    expect(teknikMærker(spilListe()[2])).toEqual(['Skvis mulig mod jer']);
  });
});

describe('Et svar uden de nye felter', () => {
  it('vises som før: ingen kort om teknikker, ingen filtre for mærker og ingen teknikmærker', () => {
    // Et svar fra før vindue 1b kan ligge i sessionStorage i en åben fane.
    const a = par();
    delete a.teknikker;
    for (const s of a.spil) {
      s.maerker = [];
      delete s.teknik;
      delete s.raad;
      delete s.linje;
    }
    vis('#/aften', a);
    expect(screen.queryByRole('region', { name: 'Teknikker i aftenens spil' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Filter' })).getAllByRole('button')).toHaveLength(2);
    expect(document.querySelectorAll('.teknik-maerke')).toHaveLength(0);
    expect(spilListe()).toHaveLength(32);
    cleanup();
    vis('#/spil/3', a);
    expect(screen.getByRole('figure', { name: /^Bordet/ })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Råd til spilføringen' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Råd til modspillet' })).toBeNull();
  });
});
