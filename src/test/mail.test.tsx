// @vitest-environment jsdom
// Accepttest 4 og 5 i SPEC-postmortem-2a-vaerd-at-se-paa.md, skrevet før bygningen: knapperne Udskriv, Mail og Kopiér på
// aftenens oversigt, vinduet "Aftenen til makker" (`#/mail`, skærm 3; mock-up'ens "Send aftenen til makker" i
// beskrivende form) og udskriftens sider. Mail-teksten for de spil, der er værd at se på, den 16. november svarer til
// den gemte reference src/test/data/mail-3287.txt. Udskriften i en rigtig browser (A4, sideskift, skjulte knapper og
// farverne) tjekkes af tools/tjek_udskrift.mjs.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hold, HOLD_URL, PAR_3287_URL, par3287, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const REFERENCE = readFileSync(join(process.cwd(), 'src', 'test', 'data', 'mail-3287.txt'), 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
const forhåndsvisning = () => screen.getByRole('region', { name: 'Sådan ser teksten ud' }).querySelector('pre')!.textContent!;

function udklipsholder() {
  const writeText = vi.fn(async (_t: string) => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

describe('Send aftenen til makker (#/mail)', () => {
  it('mail-teksten for spil værd at se på den 16. november svarer til den gemte reference', () => {
    vis('#/mail', par3287(), PAR_3287_URL);
    expect(tekst(screen.getByRole('heading', { level: 1 }))).toBe('Aftenen til makker');
    const værd = screen.getByRole('radio', { name: 'Spil værd at se på (8)' }) as HTMLInputElement;
    expect(værd.checked).toBe(true);
    expect(forhåndsvisning()).toBe(REFERENCE);
    expect(forhåndsvisning().match(/^Kommentar:$/gm)).toHaveLength(8);
    expect(forhåndsvisning()).not.toMatch(/Spiller|Hold \d/);
  });

  it('"Alle 32 spil" giver alle spil med "Kommentar:" efter hvert', () => {
    vis('#/mail', par3287(), PAR_3287_URL);
    fireEvent.click(screen.getByRole('radio', { name: 'Alle 32 spil' }));
    const t = forhåndsvisning();
    expect(t).toContain('ALLE SPIL (32)');
    expect(t.match(/^Spil \d+ · /gm)).toHaveLength(32);
    expect(t.match(/^Kommentar:$/gm)).toHaveLength(32);
    expect(t).toContain('Spil 7 · S 2♦ · 6 stik · −200 · 0 %\nBund · spilføring −1 stik · anden kontrakt end feltet\n');
    expect(t.endsWith('www.kontraktbridge.dk/postmortem/')).toBe(true);
  });

  it('"1. Kopiér gennemgangen" lægger teksten i udklipsholderen og siger det', async () => {
    const writeText = udklipsholder();
    vis('#/mail', par3287(), PAR_3287_URL);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '1. Kopiér gennemgangen' })));
    expect(writeText).toHaveBeenCalledWith(REFERENCE);
    expect(tekst(screen.getByRole('status'))).toBe('Gennemgangen er kopieret.');
  });

  it('"2. Åbn mail, og sæt ind" åbner mailto med emnet og en kort tekst', () => {
    vis('#/mail', par3287(), PAR_3287_URL);
    const link = screen.getByRole('link', { name: '2. Åbn mail, og sæt ind' });
    const href = link.getAttribute('href')!;
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    const q = new URLSearchParams(href.slice('mailto:?'.length));
    expect(q.get('subject')).toBe('Post Mortem: 16. november, 50,4 %');
    expect(q.get('body')).toBe('Gennemgangen er kopieret og sættes ind her.');
    expect(tekst(screen.getByText(/^Mailen åbner med emnet/))).toBe(
      'Mailen åbner med emnet "Post Mortem: 16. november, 50,4 %". Teksten sættes ind i mailen. På telefonen åbner del-knappen i stedet, og teksten kommer med af sig selv.',
    );
  });

  it('på telefonen deles hele teksten med navigator.share', async () => {
    const share = vi.fn(async (_d: ShareData) => {});
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const matchMedia = (q: string) => ({ matches: q.includes('coarse'), media: q, addEventListener() {}, removeEventListener() {} });
    Object.defineProperty(window, 'matchMedia', { value: matchMedia, configurable: true });
    vis('#/mail', par3287(), PAR_3287_URL);
    await act(async () => fireEvent.click(screen.getByRole('link', { name: '2. Åbn mail, og sæt ind' })));
    expect(share).toHaveBeenCalledWith({ title: 'Post Mortem: 16. november, 50,4 %', text: REFERENCE });
    delete (navigator as unknown as Record<string, unknown>).share;
    delete (window as unknown as Record<string, unknown>).matchMedia;
  });

  it('ved holdturnering står hverken holdets navn eller spillernes i teksten, og emnet har imp', () => {
    vis('#/mail', hold(), HOLD_URL, vaelg());
    const t = forhåndsvisning();
    const navne = vaelg().vaelg.hold.map((h) => h.hold);
    expect(navne.filter((n) => t.includes(n))).toEqual([]);
    expect(t).toContain('Bord 2, Nord–Syd · 16 spil');
    expect(t).toContain('Resultat: −15 imp mod jeres andet bord');
    const q = new URLSearchParams(screen.getByRole('link', { name: '2. Åbn mail, og sæt ind' }).getAttribute('href')!.slice('mailto:?'.length));
    expect(q.get('subject')).toBe('Post Mortem: 11. november, −15 imp');
  });

  it('linket tilbage fører til oversigten', () => {
    vis('#/mail', par3287(), PAR_3287_URL);
    expect(screen.getByRole('link', { name: 'Tilbage til oversigten' }).getAttribute('href')).toBe('#/aften');
  });
});

describe('Knapperne på aftenens oversigt', () => {
  it('Mail fører til vinduet, og Kopiér lægger spil værd at se på i udklipsholderen', async () => {
    const writeText = udklipsholder();
    vis('#/aften', par3287(), PAR_3287_URL);
    const knapper = screen.getByRole('group', { name: 'Del aftenen' });
    expect(within(knapper).getByRole('link', { name: 'Mail' }).getAttribute('href')).toBe('#/mail');
    await act(async () => fireEvent.click(within(knapper).getByRole('button', { name: 'Kopiér' })));
    expect(writeText).toHaveBeenCalledWith(REFERENCE);
    expect(tekst(screen.getByRole('status'))).toBe('Gennemgangen er kopieret.');
  });

  it('Udskriv lader brugeren vælge spil og åbner browserens print', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    vis('#/aften', par3287(), PAR_3287_URL);
    const udskriv = screen.getByRole('button', { name: 'Udskriv' });
    expect(udskriv.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(udskriv);
    expect(udskriv.getAttribute('aria-expanded')).toBe('true');
    const valg = screen.getByRole('group', { name: 'Hvilke spil?' });
    expect((within(valg).getByRole('radio', { name: 'Spil værd at se på (8)' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(valg).getByRole('radio', { name: 'Alle 32 spil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Udskriv nu' }));
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe('Udskriften', () => {
  const sider = () => [...document.querySelectorAll('.udskrift .udskrift-side')];

  it('side 1 og én side pr. spil værd at se på, med rammen, ny aftale og kommentarer', () => {
    vis('#/aften', par3287(), PAR_3287_URL);
    const s = sider();
    expect(s).toHaveLength(1 + 8);
    expect(document.querySelector('.udskrift')!.getAttribute('aria-hidden')).toBe('true');
    const forside = tekst(s[0]);
    expect(forside).toContain('50,4 % (225,9 af 448 point)');
    expect(forside).toContain('Hvor gik pointene?');
    expect(forside).toContain('Spil værd at se på (8)');
    expect(forside).toContain('Uheldige, ingen fejl: spil 15, 20, 26 og 27');
    expect([...s[0].querySelectorAll('.udskrift-liste li')].map((li) => tekst(li).split(' ')[0])).toEqual(['1', '4', '8', '25', '29', '6', '24', '9']);
    for (const [i, side] of s.slice(1).entries()) {
      const t = tekst(side);
      expect(t).toContain(`Side ${i + 2} af 9`);
      for (const del of ['Ved jeres bord', 'Feltet', 'Hvor gik pointene?', 'Fit', 'Udgang', 'Slem', 'Beslutning eller resultat?', 'Rigtig, godt', 'Forkert, dårligt', 'Aftalestatus', 'Klar aftale', 'Uklar aftale', 'Ingen aftale', 'Primær årsag', 'Næste gang gør vi … / ny aftale', 'Kommentarer']) {
        expect(t, `side ${i + 2}: ${del}`).toContain(del);
      }
      expect(side.querySelectorAll('.udskrift-ramme')).toHaveLength(1);
      expect(side.querySelectorAll('.udskrift-haand')).toHaveLength(4);
    }
    expect(tekst(s[1])).toMatch(/^Post Mortem · 16\. november 2026 · Efterårs Hold og Par, Par Gul Side 2 af 9 Spil 1 28,6 % · 4 af 14 point/);
    expect(tekst(s[1])).toContain('Spørg hinanden: Undersøgte vi slem? Havde vi styr på esser og nøglekort? Var 6NT eller slem i farve rigtigst ved parturnering?');
  });

  it('"Alle spil" giver side 1 og 32 sider, også spil 7', () => {
    vis('#/aften', par3287(), PAR_3287_URL);
    fireEvent.click(screen.getByRole('button', { name: 'Udskriv' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Alle 32 spil' }));
    const s = sider();
    expect(s).toHaveLength(1 + 32);
    expect(tekst(s[7])).toContain('Spil 7');
    expect(tekst(s[7])).toContain('Side 8 af 33');
  });
});
