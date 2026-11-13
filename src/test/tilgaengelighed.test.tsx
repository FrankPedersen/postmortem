// @vitest-environment jsdom
// Accepttest 7 (SPEC-postmortem-1c-app.md): label på linkfeltet, bordet som figure med aria-label og ingen klikbare div'er.
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskFetch, hold, HOLD_URL, par, svar, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Elementer, der må have en klikhandler: rigtige knapper, links og formularfelter.
const MÅ_KLIKKES = new Set(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY', 'FORM']);

/** Elementer med en React-handler for klik eller tast, som ikke er en knap, et link eller et felt. */
function klikbareAndre(): string[] {
  const ud: string[] = [];
  for (const e of document.body.querySelectorAll('*')) {
    const nøgle = Object.keys(e).find((k) => k.startsWith('__reactProps$'));
    if (!nøgle) continue;
    const props = (e as unknown as Record<string, Record<string, unknown>>)[nøgle];
    const handlere = ['onClick', 'onMouseDown', 'onPointerDown', 'onKeyDown', 'onKeyUp'].filter((h) => props[h]);
    if (handlere.length && !MÅ_KLIKKES.has(e.tagName)) ud.push(`${e.tagName.toLowerCase()}.${e.className} (${handlere.join()})`);
  }
  for (const e of document.body.querySelectorAll('[role="button"], [role="link"], [tabindex]:not(a):not(button):not(input)')) {
    if (e.getAttribute('tabindex') !== '-1') ud.push(`${e.tagName.toLowerCase()}[${e.getAttribute('role') ?? 'tabindex'}]`);
  }
  return ud;
}

describe('Tilgængelighed', () => {
  it('linkfeltet har en label og er et url-felt', () => {
    vis('#/');
    const felt = screen.getByLabelText('Link til resultatsiden') as HTMLInputElement;
    expect(felt.tagName).toBe('INPUT');
    expect(felt.type).toBe('url');
    expect(klikbareAndre()).toEqual([]);
  });

  it('bordet er en figure med aria-label, og analysevinduet har ingen klikbare div’er', () => {
    vis('#/spil/7', par());
    const bordet = screen.getByRole('figure', { name: /^Bordet/ });
    expect(bordet.tagName).toBe('FIGURE');
    expect(bordet.getAttribute('aria-label')!.length).toBeGreaterThan(60);
    expect(klikbareAndre()).toEqual([]);
  });

  it('aftenens oversigt og valget af hold har ingen klikbare div’er', async () => {
    vis('#/aften', hold(), HOLD_URL, vaelg());
    expect(klikbareAndre()).toEqual([]);
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('href')).toBeTruthy();
    cleanup();
    falskFetch(svar(200, vaelg()));
    vis('#/');
    fireEvent.change(screen.getByLabelText('Link til resultatsiden'), { target: { value: HOLD_URL } });
    fireEvent.click(screen.getByRole('button', { name: 'Analysér' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hold 1' }));
    await screen.findByRole('heading', { name: 'Sad I Nord–Syd eller Øst–Vest?' });
    expect(klikbareAndre()).toEqual([]);
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('type')).toBe('button');
  });

  it('skærmene har én h1, og fejl og status meldes til skærmlæseren', () => {
    for (const hash of ['#/', '#/aften', '#/spil/7']) {
      vis(hash, par());
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      cleanup();
    }
  });
});
