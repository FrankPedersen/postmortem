// @vitest-environment jsdom
// Accepttest 3 (SPEC-postmortem-1c-app.md): aftenens oversigt.
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Analyse } from '../typer';
import { hold, HOLD_URL, par, tekst, vaelg, vis } from './hjaelp';

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

// Testens egen talformatering: komma som decimaltegn og − som minus.
const fmt = (n: number, fortegn = false) =>
  (n < 0 ? '−' : fortegn && n > 0 ? '+' : '') + String(Math.abs(Math.round(n * 100) / 100)).replace('.', ',');

const FAKTORER = [
  ['meldinger', 'Meldinger'],
  ['spilfoering', 'Spilføring'],
  ['modspil', 'Modspil'],
  ['held', 'Held og uheld'],
] as const;

function middel(a: Analyse) {
  return a.turnering.form === 'par' ? a.spil.filter((s) => s.spillet).reduce((sum, s) => sum + (s.top ?? 0) / 2, 0) : 0;
}

const række = (område: HTMLElement, navn: string) => within(område).getByText(navn).closest('li')!;
const spilListe = () => within(screen.getByRole('list', { name: 'Spillene' })).queryAllByRole('link');

describe.each([
  ['par 452', par, undefined, undefined],
  ['hold 450', hold, HOLD_URL, vaelg],
] as const)('Aftenens oversigt, %s', (_navn, data, url, holdliste) => {
  const vísAften = () => vis('#/aften', data(), url, holdliste?.());

  it('turnering, dato, form og resultat står som i svaret', () => {
    vísAften();
    const a = data();
    expect(tekst(screen.getByRole('heading', { level: 1 }))).toBe(a.turnering.navn);
    const eyebrow = tekst(document.querySelector('.eyebrow'));
    if (a.turnering.form === 'par') {
      expect(eyebrow).toBe('Parturnering · matchpoint · 4. november 2026');
      expect(tekst(document.querySelector('.resultat'))).toBe(`Par 1 · 32 spil · 62,28 % (279 af 448 point)`);
    } else {
      expect(eyebrow).toBe('Holdturnering · imp · 11. november 2026');
      expect(tekst(document.querySelector('.resultat'))).toBe('Hold 1 · bord 2, Nord–Syd · 16 spil · −15 imp mod jeres andet bord');
    }
  });

  it('de fire faktorsummer står som i svaret, og summen er resultatet mod middel', () => {
    vísAften();
    const a = data();
    const område = screen.getByRole('region', { name: 'Hvor gik pointene?' });
    for (const [nøgle, navn] of FAKTORER) {
      expect(tekst(række(område, navn))).toBe(`${navn} ${fmt(a.faktorer[nøgle], true)}`);
    }
    const sum = FAKTORER.reduce((s, [nøgle]) => s + a.faktorer[nøgle], 0);
    const modMiddel = a.turnering.form === 'par' ? a.resultat.point! - middel(a) : a.resultat.imp!;
    expect(sum).toBe(modMiddel);
    const iAlt = a.turnering.form === 'par' ? 'I alt mod middel' : 'I alt';
    expect(tekst(række(område, iAlt))).toBe(`${iAlt} ${fmt(sum, true)}`);
  });

  it('boksen Største forbedring nævner den faktor, svaret peger på', () => {
    vísAften();
    const a = data();
    const boks = tekst(screen.getByText('Største forbedring').parentElement);
    const navn = { meldinger: 'Meldingerne', spilfoering: 'Spilføringen', modspil: 'Modspillet' }[a.stoersteForbedring!];
    expect(boks).toContain(`${navn} kostede ${fmt(-a.faktorer[a.stoersteForbedring!])}`);
  });

  it('listen har alle spil med kontrakt, udspil, stik, score og procent eller imp', () => {
    vísAften();
    const a = data();
    const links = spilListe();
    expect(links.map((l) => l.getAttribute('href'))).toEqual(a.spil.map((s) => `#/spil/${s.nummer}`));
    for (const [i, s] of a.spil.entries()) {
      const t = tekst(links[i]);
      expect(t.startsWith(String(s.nummer))).toBe(true);
      expect(t).toContain(`${s.stik} stik`);
      expect(t).toContain(fmt(s.score!, true));
      expect(t).toContain(a.turnering.form === 'par' ? `${fmt(s.procent!)} %` : fmt(s.point!, true));
    }
  });

  it('filteret Tabte point viser kun spil med negativ sum, og Alle viser dem igen', () => {
    vísAften();
    const a = data();
    const alle = screen.getByRole('button', { name: /^Alle/ });
    const tabte = screen.getByRole('button', { name: /^Tabte point/ });
    expect(alle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(tabte);
    expect(tabte.getAttribute('aria-pressed')).toBe('true');
    expect(alle.getAttribute('aria-pressed')).toBe('false');
    const negative = a.spil.filter((s) => s.faktorer && Object.values(s.faktorer).reduce((x, y) => x + y, 0) < 0);
    expect(negative.length).toBeGreaterThan(0);
    expect(negative.length).toBeLessThan(a.spil.length);
    expect(spilListe().map((l) => l.getAttribute('href'))).toEqual(negative.map((s) => `#/spil/${s.nummer}`));
    expect(tekst(tabte)).toBe(`Tabte point · ${negative.length}`);
    fireEvent.click(alle);
    expect(spilListe()).toHaveLength(a.spil.length);
  });

  it('mærket viser spillets største faktor: det mest negative, ellers det største positive', () => {
    vísAften();
    const a = data();
    const links = spilListe();
    const sete = new Set<string>();
    for (const [i, s] of a.spil.entries()) {
      const f = s.faktorer!;
      const mærker = [...links[i].querySelectorAll('.maerke')].map(tekst);
      expect(mærker).toHaveLength(1);
      const vi = (s.retning === 'NS') === (s.spilfoerer === 'N' || s.spilfoerer === 'S');
      // Udspillet er en del af modspillet, når parret spillede ud (SVAR.md).
      const udspil = s.udspilseffekt?.udspilAf === 'parret' ? s.udspilseffekt.point : 0;
      const dele: [string, number][] = [
        ['Spilføring', f.spilfoering], ['Udspil', udspil], ['Modspil', f.modspil - udspil], ['Meldinger', f.meldinger],
      ];
      const mindst = dele.reduce((m, d) => (d[1] < m[1] ? d : m));
      const størst = dele.reduce((m, d) => (d[1] > m[1] ? d : m));
      const efter = s.ddEfter ?? s.ddFoer!;
      let ventet: string | RegExp;
      if (mindst[1] < 0) {
        ventet = {
          Spilføring: `Spilføring ${fmt(s.stik! - efter)} stik`,
          Udspil: `Udspil ${fmt(s.ddFoer! - efter)} stik`,
          Modspil: `Modspil ${fmt(efter - s.stik!)} stik`,
          Meldinger: /^Meldinger: .+ var bedre$/,
        }[mindst[0]]!;
      } else if (størst[1] > 0 && størst[0] === 'Spilføring') ventet = `Spilføring ${fmt(s.stik! - efter, true)} stik`;
      else if (størst[1] > 0 && størst[0] === 'Modspil') ventet = `Modspil ${fmt(efter - s.stik!, true)} stik`;
      else ventet = vi ? 'Bedste kontrakt' : 'Bedste modspil';
      if (typeof ventet === 'string') expect(mærker[0], `spil ${s.nummer}`).toBe(ventet);
      else expect(mærker[0], `spil ${s.nummer}`).toMatch(ventet);
      sete.add(mærker[0].split(/[ :]/)[0]);
    }
    // Dataene prøver flere slags mærker.
    expect(sete.size).toBeGreaterThanOrEqual(3);
  });
});

describe('Aftenens oversigt uden svar', () => {
  it('går til start, når der ikke ligger et svar', async () => {
    vis('#/aften');
    expect(await screen.findByLabelText('Link til resultatsiden')).toBeTruthy();
  });
});
