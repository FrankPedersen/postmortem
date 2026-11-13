// @vitest-environment jsdom
// Accepttest 1 (SPEC-postmortem-1c-app.md): startskærmen.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskFetch, krop, par, PAR_URL, svar, tekst, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function analysér(url: string) {
  fireEvent.change(screen.getByLabelText('Link til resultatsiden'), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Analysér' }));
}

const knap = () => screen.getByRole('button', { name: 'Analysér' }) as HTMLButtonElement;

describe('Start', () => {
  it.each([
    'https://example.com/template/personligt_regnskab.php?pairno=1',
    'http://resultater.bridge.dk/template/personligt_regnskab.php?pairno=1',
    'https://resultater.bridge.dk.example.com/x',
    'resultater.bridge.dk/template/personligt_regnskab.php',
  ])('afviser %s i appen uden at kalde funktionen', async (url) => {
    const f = falskFetch();
    vis('#/');
    analysér(url);
    expect(tekst(await screen.findByRole('alert'))).toBe('Det er ikke et link fra resultater.bridge.dk');
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'Det er ikke et link fra resultater.bridge.dk'],
    [400, 'Brug Bordresultater eller Personligt regnskab'],
    [400, 'Holdet findes ikke på siden'],
    [413, 'Forespørgslen er for stor'],
    [422, 'Siden har ingen spil'],
    [502, 'bridge.dk svarer ikke lige nu'],
  ])('viser funktionens fejltekst ved %i: %s', async (status, fejl) => {
    falskFetch(svar(status, { fejl }));
    vis('#/');
    analysér(PAR_URL);
    expect(tekst(await screen.findByRole('alert'))).toBe(fejl);
    expect(knap().disabled).toBe(false);
  });

  it('429 vises som "For mange analyser lige nu. Prøv igen om lidt."', async () => {
    falskFetch(svar(429, { fejl: 'For mange analyser lige nu. Prøv igen om lidt.' }));
    vis('#/');
    analysér(PAR_URL);
    expect(tekst(await screen.findByRole('alert'))).toBe('For mange analyser lige nu. Prøv igen om lidt.');
  });

  it('429 uden tekst i svaret giver samme besked', async () => {
    falskFetch(new Response('', { status: 429 }));
    vis('#/');
    analysér(PAR_URL);
    expect(tekst(await screen.findByRole('alert'))).toBe('For mange analyser lige nu. Prøv igen om lidt.');
  });

  it('knappen er deaktiveret, mens funktionen regner, og analysen vises bagefter', async () => {
    let svarNu!: (r: Response) => void;
    const f = falskFetch(new Promise<Response>((ok) => (svarNu = ok)));
    vis('#/');
    analysér(PAR_URL);
    expect(knap().disabled).toBe(true);
    expect(tekst(await screen.findByRole('status'))).toBe('Regner aftenens spil …');
    expect(krop(f, 0)).toEqual({ url: PAR_URL });
    svarNu(svar(200, par()));
    expect(await screen.findByRole('heading', { level: 1, name: 'Klubsølv, 04.11.2026, aften, A-rækken' })).toBeTruthy();
    expect(window.location.hash).toBe('#/aften');
  });

  it('en fejl i nettet giver en besked, og knappen kan bruges igen', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    vis('#/');
    analysér(PAR_URL);
    expect(tekst(await screen.findByRole('alert'))).toBe('Analysen kunne ikke hentes lige nu. Prøv igen om lidt.');
    expect(knap().disabled).toBe(false);
  });

  it('har guiden i tre trin, eksemplet på adresselinjen og noten om, hvad der gemmes', () => {
    vis('#/');
    const guide = screen.getByRole('region', { name: 'Sådan finder du linket' });
    expect(within(guide).getAllByRole('listitem')).toHaveLength(3);
    expect(within(guide).getByText(/Adresselinjen ser sådan ud/)).toBeTruthy();
    expect(screen.getByText(/ingen navne/)).toBeTruthy();
  });

  it('noten fortæller om IP-tælleren (SPEC-postmortem-ip-graense.md)', () => {
    vis('#/');
    const note = tekst(screen.getByText(/ingen navne/));
    expect(note).toContain('Din IP-adresse bruges i krypteret form i højst 20 minutter til at begrænse antallet af analyser.');
  });
});
