// @vitest-environment jsdom
// Accepttest for del B (SPEC-postmortem-1b-maerker.md): analysevinduets "Råd til spilføringen" og "Råd til modspillet",
// mærket med skvis- og indspilskortet, stillingen ved stikket, ordbogens links, og at et spil uden mærker ikke viser
// tomme afsnit. Skrevet før appen blev ændret.
import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Analyse, Plads, Spil } from '../typer';
import { hold, HOLD_URL, par, RANG, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

const SYMBOL: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const NAVN: Record<Plads, string> = { N: 'Nord', E: 'Øst', S: 'Syd', W: 'Vest' };
const kort = (k: string) => `${SYMBOL[k[0]]}${RANG[k[1]] ?? k[1]}`;
const spil = (a: Analyse, nummer: number) => a.spil.find((s) => s.nummer === nummer)!;
const spilføring = () => screen.getByRole('region', { name: 'Råd til spilføringen' });
const modspil = () => screen.getByRole('region', { name: 'Råd til modspillet' });
const overskrifter = () => screen.getAllByRole('heading', { level: 2 }).map(tekst);

/** Hænderne før stikket: de kort, der ikke er spillet i de tidligere stik på linjen. */
function førStik(s: Spil, stik: number): Record<Plads, string[]> {
  const spillet = new Set(s.linje!.slice(0, stik - 1).flatMap((x) => x.kort));
  const ud = {} as Record<Plads, string[]>;
  for (const p of ['N', 'E', 'S', 'W'] as Plads[]) {
    ud[p] = s.haender[p].split('.').map((farve, i) => [...farve].filter((k) => !spillet.has('SHDC'[i] + k)).map((k) => RANG[k] ?? k).join(''));
  }
  return ud;
}

describe('Råd til spilføringen, 452 spil 3 (skvis, parret var spilfører)', () => {
  it('spilføringen står før modspillet, efter de fire faktorer', () => {
    vis('#/spil/3', par());
    const h = overskrifter();
    expect(h.indexOf('Hvor gik pointene?')).toBeLessThan(h.indexOf('Råd til spilføringen'));
    expect(h.indexOf('Råd til spilføringen')).toBeLessThan(h.indexOf('Råd til modspillet'));
  });

  it('mærket står med stikket: "Skvis mulig · stik 9", og linjen siger "Uden skvisen 9 stik, med 10."', () => {
    vis('#/spil/3', par());
    const t = spil(par(), 3).teknik!.skvis!;
    expect([t.mod, t.stik, t.kort, t.medTeknik, t.udenTeknik]).toEqual(['W', 9, 'DA', 10, 9]);
    const r = spilføring();
    expect([...r.querySelectorAll('.teknik-maerke')].map(tekst)).toEqual(['Skvis mulig · stik 9']);
    expect(within(r).getByRole('heading', { level: 3, name: 'Skvis mod Vest' })).toBeTruthy();
    expect(tekst(r)).toContain('Uden skvisen 9 stik, med 10.');
  });

  it('skviskortet vises i mærket fra teknik, også når det ikke står blandt nøglebeslutningerne', () => {
    vis('#/spil/3', par());
    const s = spil(par(), 3);
    // ♦E er Syds eneste vinder i stik 9, så den er ikke en nøglebeslutning (Franks ændring 14. november 2026).
    expect(s.raad!.spilfoering.some((n) => n.stik === 9 && n.kort === 'DA')).toBe(false);
    expect(s.linje![8].udspiller).toBe('S');
    expect(tekst(spilføring())).toContain('Skviskortet er ♦E i stik 9, spillet fra Syd. Vest kan ikke bekende og har ♠ og ♥ tilbage.');
  });

  it('stillingen ved skvisstikket er et lille bord med de kort, der er tilbage', () => {
    vis('#/spil/3', par());
    const s = spil(par(), 3);
    const figur = within(spilføring()).getByRole('figure', { name: /^Stillingen før stik 9/ });
    const tilbage = førStik(s, 9);
    for (const p of ['N', 'E', 'S', 'W'] as Plads[]) {
      const hånd = figur.querySelector(`[data-plads="${p}"]`)!;
      expect(tekst(hånd.querySelector('.plads-navn'))).toBe(NAVN[p]);
      expect([...hånd.querySelectorAll('.farve')].map(tekst)).toEqual(tilbage[p].map((k, i) => `${'♠♥♦♣'[i]} ${k || '—'}`));
      expect(tilbage[p].join('').replace(/10/g, 'T')).toHaveLength(5);
    }
    // Vest holder spar og hjerter; Syd er inde og spiller ♦E.
    expect(tilbage.W.slice(2)).toEqual(['', '']);
    expect(tekst(figur.querySelector('figcaption'))).toBe('Stillingen før stik 9 · Syd spiller ♦E');
    expect(figur.getAttribute('aria-label')).toContain('Vest: spar E D 10, hjerter D 6, ruder renonce, klør renonce');
    // Det store bord er stadig det eneste, der hedder Bordet.
    expect(screen.getAllByRole('figure', { name: /^Bordet/ })).toHaveLength(1);
  });

  it('boksen "Sådan spotter du den" og ordbogens Skvis og Slutspil står i afsnittet', () => {
    vis('#/spil/3', par());
    const r = spilføring();
    const boks = within(r).getByText('Sådan spotter du den').parentElement!;
    expect(tekst(boks)).toMatch(/^Sådan spotter du den En skvis er en form for slutspil/);
    const links = within(r).getAllByRole('link').map((a) => [tekst(a), a.getAttribute('href')]);
    expect(links).toEqual([['Skvis i ordbogen', '/ordbog/#skvis'], ['Slutspil i ordbogen', '/ordbog/#slutspil']]);
  });

  it('nøglebeslutningerne står som i svaret: stik, kort, hånd, DD-tal og de dyreste alternativer', () => {
    vis('#/spil/3', par());
    const s = spil(par(), 3);
    const liste = within(spilføring()).getByRole('list', { name: 'Nøglebeslutninger' });
    const rækker = within(liste).getAllByRole('listitem');
    expect(rækker).toHaveLength(s.raad!.spilfoering.length);
    expect(rækker.length).toBeGreaterThan(0);
    for (const [i, n] of s.raad!.spilfoering.entries()) {
      const t = tekst(rækker[i]);
      expect(t.startsWith(`Stik ${n.stik} `)).toBe(true);
      // Nord er spilfører, så Syd er bordet.
      expect(t).toContain(`${kort(n.kort)} fra ${NAVN[n.haand]}${n.haand === 'S' ? ' (bordet)' : ''} holder ${n.dd} stik.`);
      for (const a of n.alternativer) expect(t).toContain(`giver ${a.dd} stik`);
      expect(n.alternativer.every((a) => a.dd < n.dd)).toBe(true);
    }
  });

  it('modspillets afsnit siger, hvem skvisen er mod, og at det bedste modspil ikke kan forhindre den', () => {
    vis('#/spil/3', par());
    expect(tekst(modspil())).toContain('Skvisen er mod Vest. Det bedste modspil kan ikke forhindre den.');
    expect(tekst(modspil().querySelector('.hint'))).toBe('Øst–Vest i modspil');
  });

  it('udspillets pris og de bedste udspil står i modspillets afsnit', () => {
    vis('#/spil/3', par());
    const s = spil(par(), 3);
    expect([s.udspil, s.raad!.udspil.pris, s.ddFoer, s.ddEfter]).toEqual(['C8', 2, 8, 10]);
    const række = within(modspil()).getByText('Udspil').closest('li')!;
    expect(tekst(række)).toContain('♣8 fra Øst koster 2 stik: spilfører har 10 stik efter udspillet og 8 efter det bedste.');
    expect(tekst(række)).toContain('Bedste udspil: ');
    // Hvert af de bedste udspil står med farvens tegn.
    for (const gruppe of s.raad!.udspil.bedste) expect(tekst(række)).toContain(SYMBOL[gruppe[0][0]]);
  });
});

describe('Råd til spilføringen, 452 spil 18 (indspil)', () => {
  it('mærket hedder "Indspil muligt · stik 9" med indspilskortet ♥B og "Uden indspillet 9 stik, med 10."', () => {
    vis('#/spil/18', par());
    const s = spil(par(), 18);
    const t = s.teknik!.indspil!;
    expect([t.mod, t.stik, t.kort, t.medTeknik, t.udenTeknik]).toEqual(['E', 9, 'HJ', 10, 9]);
    const r = spilføring();
    expect([...r.querySelectorAll('.teknik-maerke')].map(tekst)).toEqual(['Indspil muligt · stik 9']);
    expect(within(r).getByRole('heading', { level: 3, name: 'Indspil mod Øst' })).toBeTruthy();
    expect(tekst(r)).toContain('Uden indspillet 9 stik, med 10.');
    expect(s.linje![8]).toMatchObject({ udspiller: 'N', vinder: 'E' });
    expect(tekst(r)).toContain('Indspilskortet er ♥B i stik 9, spillet fra Nord. Øst vinder stikket og skal spille ud.');
    expect(within(r).getByRole('figure', { name: /^Stillingen før stik 9/ })).toBeTruthy();
  });

  it('forklaringen bruger ordbogens ord, og linkene går til Indspil og Slutspil', () => {
    vis('#/spil/18', par());
    const r = spilføring();
    expect(tekst(within(r).getByText('Sådan spotter du den').parentElement)).toMatch(/^Sådan spotter du den Et indspil er en form for slutspil/);
    const links = within(r).getAllByRole('link').map((a) => [tekst(a), a.getAttribute('href')]);
    expect(links).toEqual([['Indspil i ordbogen', '/ordbog/#indspil'], ['Slutspil i ordbogen', '/ordbog/#slutspil']]);
    expect(tekst(modspil())).toContain('Indspillet er mod Øst. Det bedste modspil kan ikke forhindre det.');
  });
});

describe('Råd til modspillet, 450 spil 9 (indspil mod holdet, der var i modspil)', () => {
  const vis9 = () => vis('#/spil/9', hold(), HOLD_URL, vaelg());

  it('modspillet står først, når holdet var i modspil', () => {
    vis9();
    const s = spil(hold(), 9);
    expect([s.retning, s.spilfoerer]).toEqual(['NS', 'W']);
    const h = overskrifter();
    expect(h.indexOf('Råd til modspillet')).toBeGreaterThan(h.indexOf('Hvor gik pointene?'));
    expect(h.indexOf('Råd til modspillet')).toBeLessThan(h.indexOf('Råd til spilføringen'));
    expect(tekst(modspil().querySelector('.hint'))).toBe('I var i modspil');
  });

  it('mærket hedder "Indspil muligt mod jer · stik 11", og indspilskortet ♥7 står i mærket', () => {
    vis9();
    const t = spil(hold(), 9).teknik!.indspil!;
    expect([t.mod, t.stik, t.kort, t.medTeknik, t.udenTeknik]).toEqual(['N', 11, 'H7', 10, 9]);
    const r = spilføring();
    expect([...r.querySelectorAll('.teknik-maerke')].map(tekst)).toEqual(['Indspil muligt mod jer · stik 11']);
    expect(within(r).getByRole('heading', { level: 3, name: 'Indspil mod jer (Nord)' })).toBeTruthy();
    expect(tekst(r)).toContain('Uden indspillet 9 stik, med 10.');
    expect(tekst(r)).toContain('Indspilskortet er ♥7 i stik 11, spillet fra Vest. Nord vinder stikket og skal spille ud.');
    expect(tekst(modspil())).toContain('Indspillet er mod jer (Nord). Det bedste modspil kan ikke forhindre det.');
  });

  it('et udspil, der står forkert på bridge.dk, erstattes af det bedste udspil, og det står i afsnittet', () => {
    vis9();
    const s = spil(hold(), 9);
    expect(s.teknik!.udspilAntaget).toBe(true);
    expect(s.raad!.udspil).toMatchObject({ faktisk: null, pris: null });
    const første = s.linje![0].kort[0];
    const række = within(modspil()).getByText('Udspil').closest('li')!;
    expect(tekst(række)).toContain(`Udspillet står forkert på bridge.dk; analysen bruger det bedste udspil (${kort(første)}).`);
    expect(tekst(række)).not.toContain('koster');
  });

  it('modspillets nøglebeslutninger står med "holder spilfører på"', () => {
    const a = hold();
    const s = a.spil.find((x) => x.raad!.modspil.length > 0)!;
    vis(`#/spil/${s.nummer}`, a, HOLD_URL, vaelg());
    const liste = within(modspil()).getByRole('list', { name: 'Nøglebeslutninger' });
    const rækker = within(liste).getAllByRole('listitem').filter((li) => !tekst(li).startsWith('Udspil'));
    expect(rækker).toHaveLength(s.raad!.modspil.length);
    for (const [i, n] of s.raad!.modspil.entries()) {
      const t = tekst(rækker[i]);
      expect(t.startsWith(`Stik ${n.stik} `)).toBe(true);
      expect(t).toContain(`${kort(n.kort)} fra ${NAVN[n.haand]} holder spilfører på ${n.dd} stik.`);
      for (const alt of n.alternativer) expect(t).toContain(`giver spilfører ${alt.dd} stik`);
    }
  });
});

describe('Udspillet', () => {
  it('et udspil blandt de bedste koster intet', () => {
    const a = par();
    const s = a.spil.find((x) => x.raad!.udspil.pris === 0)!;
    vis(`#/spil/${s.nummer}`, a);
    const række = within(modspil()).getByText('Udspil').closest('li')!;
    expect(tekst(række)).toContain(`${kort(s.udspil!)} fra ${NAVN[s.linje![0].udspiller]} er blandt de bedste udspil: spilfører har ${s.ddEfter} stik.`);
    expect(tekst(række)).not.toContain('koster');
  });
});

describe('Kast-ind-skvis og dobbeltskvis', () => {
  it('begge mærker vises, og kast-ind-skvisen nævnes', () => {
    // Et konstrueret svar: spil 18 får også en skvis mod Øst i stik 8.
    const a = par();
    const s = spil(a, 18);
    s.maerker = ['skvis', 'indspil'];
    s.teknik = { ...s.teknik!, skvis: { mod: 'E', stik: 8, kort: s.linje![7].kort[0], farver: ['H', 'D'], medTeknik: 10, udenTeknik: 9 }, kastIndSkvis: true };
    vis('#/spil/18', a);
    const r = spilføring();
    expect([...r.querySelectorAll('.teknik-maerke')].map(tekst)).toEqual(['Skvis mulig · stik 8', 'Indspil muligt · stik 9']);
    expect(tekst(r)).toContain('Kast-ind-skvis: Øst må først kaste et kort, han har brug for, og sættes derefter ind.');
    const links = within(r).getAllByRole('link').map(tekst);
    expect(links).toEqual(['Skvis i ordbogen', 'Indspil i ordbogen', 'Slutspil i ordbogen']);
    expect(within(r).getAllByRole('figure')).toHaveLength(2);
  });

  it('en skvis mod begge modspillere hedder dobbeltskvis, og et mærke uden stik vises uden stilling', () => {
    const a = par();
    const s = spil(a, 3);
    s.teknik = { ...s.teknik!, skvis: { ...s.teknik!.skvis!, mod: 'begge', stik: null, kort: null, farver: [] } };
    vis('#/spil/3', a);
    const r = spilføring();
    expect([...r.querySelectorAll('.teknik-maerke')].map(tekst)).toEqual(['Skvis mulig']);
    expect(within(r).getByRole('heading', { level: 3, name: 'Dobbeltskvis mod begge modspillere' })).toBeTruthy();
    expect(within(r).queryByRole('figure')).toBeNull();
    expect(tekst(r)).not.toContain('Skviskortet');
    expect(tekst(modspil())).toContain('Skvisen er mod begge modspillere. Det bedste modspil kan ikke forhindre den.');
  });
});

describe('Et spil uden mærker viser ikke tomme afsnit', () => {
  const tomme = () =>
    [...document.querySelectorAll('main section, main ol, main ul, main figure, main .spot, main .teknik')]
      .filter((e) => (e.tagName === 'SECTION' ? tekst(e) === tekst(e.querySelector('h2')) : tekst(e) === ''))
      .map((e) => `${e.tagName.toLowerCase()}.${e.className}`);

  it.each([
    ['par 452', par, undefined, undefined],
    ['hold 450', hold, HOLD_URL, vaelg],
  ] as const)('%s: hvert spil', (_navn, data, url, liste) => {
    const a = data();
    let udenRåd = 0;
    for (const s of a.spil) {
      vis(`#/spil/${s.nummer}`, a, url, liste?.());
      expect(tomme(), `spil ${s.nummer}`).toEqual([]);
      const harMærke = s.maerker.length > 0;
      if (!harMærke) {
        expect(document.querySelectorAll('.teknik-maerke, .spot, .ordbog-links'), `spil ${s.nummer}`).toHaveLength(0);
        expect(screen.queryByRole('figure', { name: /^Stillingen/ })).toBeNull();
        expect(document.body.textContent).not.toMatch(/Skvis|Indspil|Sådan spotter/);
      }
      // Uden mærke og uden nøglebeslutninger for spilfører er der intet afsnit om spilføringen.
      const venterSpilføring = harMærke || s.raad!.spilfoering.length > 0;
      expect(!!screen.queryByRole('region', { name: 'Råd til spilføringen' }), `spil ${s.nummer}`).toBe(venterSpilføring);
      if (!venterSpilføring) udenRåd++;
      // Udspillet står altid i modspillets afsnit.
      expect(within(modspil()).getByText('Udspil')).toBeTruthy();
      cleanup();
    }
    expect(udenRåd).toBeGreaterThan(0);
  });

  it('et spil, der ikke er spillet eller er passet ud, har ingen råd', () => {
    const a = par();
    const s = spil(a, 3);
    Object.assign(s, {
      maerker: [], raad: null, linje: null,
      teknik: { beregnet: false, grund: 'pas', udspilAntaget: null, stikFoerP: null, skvis: null, indspil: null, kastIndSkvis: false },
    });
    vis('#/spil/3', a);
    expect(screen.queryByRole('region', { name: 'Råd til spilføringen' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Råd til modspillet' })).toBeNull();
    expect(document.body.textContent).not.toContain('kunne ikke regnes');
  });

  it('kunne teknikken ikke regnes (tid eller fejl), står det i én linje', () => {
    for (const grund of ['tid', 'fejl'] as const) {
      const a = par();
      Object.assign(spil(a, 3), {
        maerker: [], raad: null, linje: null,
        teknik: { beregnet: false, grund, udspilAntaget: null, stikFoerP: null, skvis: null, indspil: null, kastIndSkvis: false },
      });
      vis('#/spil/3', a);
      expect(screen.queryByRole('region', { name: 'Råd til spilføringen' })).toBeNull();
      expect(screen.queryByRole('region', { name: 'Råd til modspillet' })).toBeNull();
      expect(screen.getByText('Rådene kunne ikke regnes for dette spil.')).toBeTruthy();
      cleanup();
    }
  });
});

describe('Guiden og noten', () => {
  it('startskærmen siger, hvad rådene gælder, og hvad der ikke findes', () => {
    vis('#/');
    const guide = screen.getByRole('region', { name: 'Sådan læses rådene' });
    const punkter = within(guide).getAllByRole('listitem').map(tekst);
    expect(punkter).toHaveLength(5);
    const alt = punkter.join(' ');
    expect(alt).toContain('Rådene gælder den bedste linje efter udspillet, ikke det, der blev spillet.');
    expect(alt).toContain('Skvis og indspil findes i de sidste seks stik');
    expect(alt).toContain('Et indspil, der kun er nødvendigt, fordi spilfører mangler en indgang, findes ikke.');
    expect(alt).toContain('Ved bordet kan en kipning være lige så god.');
    expect(alt).toContain('Står udspillet forkert på bridge.dk, bruger analysen det bedste udspil.');
    // Guiden til linket er uændret.
    expect(within(screen.getByRole('region', { name: 'Sådan finder du linket' })).getAllByRole('listitem')).toHaveLength(3);
  });

  it('noten i analysevinduet siger det samme i kort form', () => {
    vis('#/spil/3', par());
    const note = tekst(document.querySelector('.fod-note'));
    expect(note).toContain('Rådene gælder den bedste linje efter det faktiske udspil, ikke det, der blev spillet.');
    expect(note).toContain('Skvis og indspil findes i de sidste seks stik.');
  });
});

describe('Tilgængelighed i rådene', () => {
  it('afsnittene er regioner med overskrift, listerne har navn, og intet andet end links kan klikkes', () => {
    vis('#/spil/3', par());
    for (const r of [spilføring(), modspil()]) {
      expect(r.tagName).toBe('SECTION');
      expect(within(r).getAllByRole('heading', { level: 2 })).toHaveLength(1);
      expect(within(r).getAllByRole('list', { name: 'Nøglebeslutninger' })).toHaveLength(1);
      expect(r.querySelectorAll('button, [role="button"], [tabindex]')).toHaveLength(0);
    }
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });
});
