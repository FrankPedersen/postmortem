// @vitest-environment jsdom
// Accepttest 2 (SPEC-postmortem-1c-app.md): holdturnering med holdliste og retning.
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { falskFetch, hold, HOLD_URL, krop, svar, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function sendLink() {
  fireEvent.change(screen.getByLabelText('Link til resultatsiden'), { target: { value: HOLD_URL } });
  fireEvent.click(screen.getByRole('button', { name: 'Analysér' }));
  await screen.findByRole('heading', { name: 'Hvilket hold spillede I på?' });
}

async function vælgHold(navn: string, retning: RegExp) {
  await sendLink();
  fireEvent.click(screen.getByRole('button', { name: navn }));
  await screen.findByRole('heading', { name: 'Sad I Nord–Syd eller Øst–Vest?' });
  fireEvent.click(screen.getByRole('button', { name: retning }));
}

describe('Holdturnering', () => {
  it('viser holdene fra vaelg, hvert hold én gang', async () => {
    falskFetch(svar(200, vaelg()));
    vis('#/');
    await sendLink();
    const navne = [...new Set(vaelg().vaelg.hold.map((h) => h.hold))].sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
    const knapper = screen.getAllByRole('button').map((b) => tekst(b)).filter((t) => t.startsWith('Hold '));
    expect(knapper).toEqual(navne);
    expect(window.location.hash).toBe('#/hold');
  });

  it('Hold 1 og Nord–Syd giver id 2-NS, og analysen vises bagefter', async () => {
    const f = falskFetch(svar(200, vaelg()), svar(200, hold()));
    vis('#/');
    await vælgHold('Hold 1', /^Nord–Syd/);
    expect(krop(f, 0)).toEqual({ url: HOLD_URL });
    expect(krop(f, 1)).toEqual({ url: HOLD_URL, hold: '2-NS' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Holdturnering, A-rækken' })).toBeTruthy();
    const resultat = tekst(document.querySelector('.resultat'));
    expect(resultat).toContain('−15 imp mod jeres andet bord');
    expect(resultat).toContain('Hold 1');
  });

  it('Hold 1 og Øst–Vest giver id 6-OV', async () => {
    const f = falskFetch(svar(200, vaelg()), svar(200, hold()));
    vis('#/');
    await vælgHold('Hold 1', /^Øst–Vest/);
    expect(krop(f, 1)).toEqual({ url: HOLD_URL, hold: '6-OV' });
  });

  it('hvert hold og hver retning svarer til præcis ét id i vaelg.hold', () => {
    const v = vaelg().vaelg.hold;
    for (const navn of new Set(v.map((h) => h.hold))) {
      for (const r of ['NS', 'OV']) expect(v.filter((h) => h.hold === navn && h.retning === r)).toHaveLength(1);
    }
  });
});
