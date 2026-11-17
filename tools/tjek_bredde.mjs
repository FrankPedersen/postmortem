// Accepttest 6 i en rigtig browser (SPEC-postmortem-1c-app.md): ingen vandret rulning ved 320 px på start, valg af hold,
// aftenens oversigt og analysevinduet for hvert spil i begge testsvar, og alle knapper og links har en trykflade på mindst
// 44 × 44 px. Samme teknik som Forsidens tools/tjek_bredde.mjs: Chrome eller Edge uden vindue, styret over DevTools.
//
//   node tools/tjek_bredde.mjs                   tjekker ved 320, 390 og 1280 px (og at intet ligger oven i kompasset)
//   node tools/tjek_bredde.mjs --billeder=mappe  gemmer også skærmbilleder af skærmene ved 390 og 1280 px, af
//                                                oversigten for 16. november med ⓘ lukket og åben ved 320, 390 og 1280 px
//                                                og af ⓘ åben ved holdturnering og i analysevinduet ved 390 og 1280 px
//
// SPEC-postmortem-1d-point.md: aftenen 16. november (par-3287.json) er med, og ⓘ ved "Hvor gik pointene?" åbner og
// lukker med mus, tryk og tastatur uden vandret rulning. Efter Franks svar 17. nov. 2026 står ⓘ på oversigten og i
// analysevinduet ved både parturnering og holdturnering; --billeder gemmer også ⓘ åben ved holdturnering og i
// analysevinduet ved 390 og 1280 px.
//
// SPEC-postmortem-2a-vaerd-at-se-paa.md (accepttest 6): kortet "Spil værd at se på" med "Vis alle" åben, valget under
// Udskriv og vinduet til mailen (`#/mail`) for alle tre testsvar, uden vandret rulning og med 44 px trykflader; "Vis alle"
// åbner og lukker med Enter og har aria-expanded, og en lukket fold i Meldesamtalen åbner med Enter. --billeder gemmer
// også skærmbillederne af det nye ved 390 og 1280 px for 16. november (filerne begynder med "2a-").
//
// Appen køres med Vites udviklingsserver, og svarene fra src/test/data/ lægges i sessionStorage som efter en analyse,
// så testen ikke kalder funktionen. Kræver Node 22+. Stien til browseren kan gives i CHROME.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROD = fileURLToPath(new URL('..', import.meta.url));
const BILLEDER = process.argv.find((a) => a.startsWith('--billeder='))?.slice('--billeder='.length);
const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) {
  console.error('Fandt hverken Chrome eller Edge; sæt CHROME til stien.');
  process.exit(2);
}

const læs = (navn) => JSON.parse(readFileSync(join(ROD, 'src', 'test', 'data', navn), 'utf8'));
const PAR = læs('par-452.json');
const HOLD = læs('hold-450.json');
const VAELG = læs('hold-450-vaelg.json');
const PAR_3287 = læs('par-3287.json');
const PAR_3287_URL = 'https://resultater.bridge.dk/template/personligt_regnskab.php?filename=1111/MT3287GT11912.XML&tournament=3287&section=7&pairno=1';
const INFO = 'Hjælp: Hvor gik pointene?';
// Begyndelsen, en sætning midt i og slutningen af ⓘ-teksten for hver form (Franks svar 17. nov. 2026 og, for imp-teksten,
// Franks svar og godkendelse samme dag).
const INFO_TEKST = {
  par: { start: 'Point er parpoint.', midt: 'omregnes pointene, så alle spil tæller lige meget, som hos bridge.dk.', slut: 'Summen er jeres point mod middel.' },
  hold: { start: 'Point er imp.', midt: 'lægges jeres score og holdkammeraternes score ved det andet bord sammen, og summen omregnes til imp.', slut: 'Summen er jeres imp.' },
};
// Spillet i analysevinduet, hvor ⓘ prøves for hvert testsvar.
const INFO_SPIL = { 'par 452': 7, 'hold 450': 4, 'par 3287': 32 };
const PAR_URL = 'https://resultater.bridge.dk/template/personligt_regnskab.php?filename=2151/MT452GT720.XML&tournament=452&section=1&pairno=1';
const HOLD_URL = 'https://resultater.bridge.dk/template/multihold_bordresultater.php?filename=2151/MT450GT714.XML&tournament=450&section=2&round=2&half=1';
// Samme nøgle og form som src/lager.ts.
const NØGLE = 'postmortem';

const vent = (ms) => new Promise((r) => setTimeout(r, ms));
let fejl = 0;
const tjek = (ok, navn, detalje = '') => {
  if (!ok) fejl++;
  console.log(`${ok ? 'ok  ' : 'FEJL'} ${navn}${!ok && detalje ? ` – ${detalje}` : ''}`);
};

const server = await createServer({ root: ROD, configFile: join(ROD, 'vite.config.ts'), logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const BASE = server.resolvedUrls.local[0];

const profil = mkdtempSync(join(tmpdir(), 'pm-bredde-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', '--lang=da-DK', 'about:blank'], { stdio: 'ignore' });

try {
  let targets;
  for (let i = 0; i < 100 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await vent(200); }
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((ok, nej) => { ws.onopen = ok; ws.onerror = nej; });
  let id = 0;
  const venter = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && venter.has(d.id)) { venter.get(d.id)(d); venter.delete(d.id); } };
  const send = (method, params = {}) => new Promise((ok) => { const n = ++id; venter.set(n, ok); ws.send(JSON.stringify({ id: n, method, params })); });
  const kør = async (expression) => {
    const d = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (d.result?.exceptionDetails) throw new Error(`${expression.slice(0, 80)}: ${d.result.exceptionDetails.exception?.description}`);
    return d.result?.result?.value;
  };
  await send('Page.enable');

  const størrelse = (bredde, højde = 844) => send('Emulation.setDeviceMetricsOverride', { width: bredde, height: højde, deviceScaleFactor: 1, mobile: bredde < 1000 });
  // Et nyt tal i adressen giver en rigtig indlæsning, så appen læser sessionStorage igen (kun et nyt # ville ikke).
  let indlæsning = 0;
  const indlæs = async (hash) => {
    await send('Page.navigate', { url: `${BASE}?n=${++indlæsning}${hash}` });
    for (let i = 0; i < 100; i++) {
      await vent(100);
      if (await kør(`document.readyState === 'complete' && !!document.querySelector('main h1')`).catch(() => false)) break;
    }
    await kør('document.fonts.ready.then(() => true)');
  };
  const gemSvar = (svar, url, vaelg) => kør(`sessionStorage.setItem(${JSON.stringify(NØGLE)}, ${JSON.stringify(JSON.stringify({ url, svar, vaelg }))}); true`);
  const gåTil = async (hash) => {
    await kør(`location.hash = ${JSON.stringify(hash)}; new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);
    await vent(30);
  };
  const MÅL = `(() => {
    const d = document.documentElement;
    const synlig = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const ud = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > d.clientWidth + 0.5)
      .slice(0, 4).map((e) => e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''));
    const små = [...document.querySelectorAll('a[href], button')].filter(synlig).map((e) => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.width < 43.5 || r.height < 43.5)
      .map(([e, r]) => (e.getAttribute('aria-label') || e.textContent.trim()).slice(0, 30) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    // Ingen hånd eller pladsnavn må ligge oven i kompasset.
    const kompas = document.querySelector('.kompas')?.getBoundingClientRect();
    const overlap = !kompas ? [] : [...document.querySelectorAll('.haand > *')].map((e) => [e, e.getBoundingClientRect()])
      .filter(([, r]) => r.left < kompas.right - 0.5 && r.right > kompas.left + 0.5 && r.top < kompas.bottom - 0.5 && r.bottom > kompas.top + 0.5)
      .map(([e]) => e.textContent.trim());
    if (overlap.length) små.push('over kompasset: ' + overlap.join(', '));
    // Det samme i de små borde med stillingen ved skvis- og indspilsstikket (vindue 1b, del B).
    for (const bord of document.querySelectorAll('.stilling')) {
      const k = bord.querySelector('.stilling-kompas').getBoundingClientRect();
      const over = [...bord.querySelectorAll('.stilling-haand > *')].map((e) => [e, e.getBoundingClientRect()])
        .filter(([, r]) => r.left < k.right - 0.5 && r.right > k.left + 0.5 && r.top < k.bottom - 0.5 && r.bottom > k.top + 0.5)
        .map(([e]) => e.textContent.trim());
      if (over.length) små.push('over det lille kompas: ' + over.join(', '));
    }
    return { h1: document.querySelector('h1')?.textContent.trim(), scroll: d.scrollWidth, client: d.clientWidth, ud, små };
  })()`;
  const billede = async (navn) => {
    if (!BILLEDER) return;
    mkdirSync(BILLEDER, { recursive: true });
    const { cssContentSize } = await send('Page.getLayoutMetrics').then((d) => d.result);
    const b = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } });
    writeFileSync(join(BILLEDER, navn), Buffer.from(b.result.data, 'base64'));
  };
  // Et skærmbillede af ét element (fx kortet "Spil værd at se på") med 16 px luft omkring.
  const elementBillede = async (navn, vælger) => {
    if (!BILLEDER) return;
    mkdirSync(BILLEDER, { recursive: true });
    const r = await kør(`(() => { const e = document.querySelector(${JSON.stringify(vælger)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, r.left + scrollX - 16), y: Math.max(0, r.top + scrollY - 16), width: Math.min(document.documentElement.clientWidth, r.width + 32), height: r.height + 32 }; })()`);
    if (!r) return tjek(false, `skærmbillede ${navn}: ${vælger} findes`);
    const b = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...r, scale: 1 } });
    writeFileSync(join(BILLEDER, navn), Buffer.from(b.result.data, 'base64'));
  };

  // ⓘ ved "Hvor gik pointene?" (accepttest 6): mus, tryk og tastatur i browseren, med ⓘ's midte som mål.
  const FIND_INFO = `[...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === ${JSON.stringify(INFO)})`;
  const infoTilstand = () => kør(`(() => {
    const k = ${FIND_INFO};
    if (!k) return null;
    const r = k.getBoundingClientRect();
    const p = document.getElementById(k.getAttribute('aria-controls'));
    return { åben: k.getAttribute('aria-expanded') === 'true', synlig: !!p && p.checkVisibility(), tekst: p ? p.textContent.replace(/\\s+/g, ' ').trim() : '',
      x: r.left + r.width / 2, y: r.top + r.height / 2, fokus: document.activeElement === k, b: Math.round(r.width), h: Math.round(r.height) };
  })()`);
  const tilInfo = () => kør(`(() => { ${FIND_INFO}.scrollIntoView({ block: 'center' }); return true; })()`);
  const mus = async () => {
    const t = await infoTilstand();
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: t.x, y: t.y, button: 'left', clickCount: 1 });
    await vent(50);
  };
  const tryk = async () => {
    const t = await infoTilstand();
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await vent(100);
  };
  const tast = async (key, code, kode) => {
    const tekst = key === 'Enter' ? { text: '\r' } : key === ' ' ? { text: ' ' } : {};
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: kode, nativeVirtualKeyCode: kode, ...tekst });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: kode, nativeVirtualKeyCode: kode });
    await vent(50);
  };
  const tjekInfo = async (bredde, navn, form) => {
    const navnet = `${bredde} px, ${navn}, ⓘ`;
    const forventet = INFO_TEKST[form];
    let t = await infoTilstand();
    if (!t) return tjek(false, `${navnet} står ved "Hvor gik pointene?"`);
    await tilInfo();
    t = await infoTilstand();
    tjek(!t.åben && !t.synlig, `${navnet}: lukket fra start`, JSON.stringify(t));
    await mus();
    t = await infoTilstand();
    tjek(t.åben && t.synlig && t.tekst.startsWith(forventet.start) && t.tekst.includes(forventet.midt) && t.tekst.endsWith(forventet.slut), `${navnet}: åbner med musen og viser teksten`, JSON.stringify(t).slice(0, 300));
    const m = await kør(MÅL);
    tjek(m.scroll <= m.client, `${navnet}: ingen vandret rulning med teksten åben`, `${m.scroll} px i ${m.client} px – stikker ud: ${m.ud.join(', ')}`);
    tjek(m.små.length === 0, `${navnet}: knapper og links er mindst 44 × 44 px med teksten åben`, m.små.slice(0, 6).join(' | '));
    await mus();
    t = await infoTilstand();
    tjek(!t.åben && !t.synlig, `${navnet}: lukker med musen`, JSON.stringify(t));
    await tryk();
    t = await infoTilstand();
    tjek(t.åben && t.synlig, `${navnet}: åbner med et tryk`, JSON.stringify(t));
    await tryk();
    t = await infoTilstand();
    tjek(!t.åben && !t.synlig, `${navnet}: lukker med et tryk`, JSON.stringify(t));
    await kør(`${FIND_INFO}.focus(); true`);
    await tast('Enter', 'Enter', 13);
    t = await infoTilstand();
    tjek(t.åben && t.synlig, `${navnet}: åbner med Enter`, JSON.stringify(t));
    await tast('Escape', 'Escape', 27);
    t = await infoTilstand();
    tjek(!t.åben && !t.synlig && t.fokus, `${navnet}: lukker med Escape, og fokus bliver på ⓘ`, JSON.stringify(t));
    await tast(' ', 'Space', 32);
    t = await infoTilstand();
    tjek(t.åben && t.synlig, `${navnet}: åbner med mellemrum`, JSON.stringify(t));
    await tast(' ', 'Space', 32);
    t = await infoTilstand();
    tjek(!t.åben && !t.synlig, `${navnet}: lukker med mellemrum`, JSON.stringify(t));
    await kør('window.scrollTo(0, 0); true');
  };

  for (const bredde of [320, 390, 1280]) {
    await størrelse(bredde);
    await indlæs('#/');
    await kør(`sessionStorage.clear(); true`);
    const skærme = [];
    const mål = async (navn) => {
      const m = await kør(MÅL);
      skærme.push(navn);
      tjek(m.scroll <= m.client, `${bredde} px, ${navn}: ingen vandret rulning`, `${m.scroll} px i ${m.client} px – stikker ud: ${m.ud.join(', ')}`);
      tjek(m.små.length === 0, `${bredde} px, ${navn}: knapper og links er mindst 44 × 44 px`, m.små.slice(0, 6).join(' | '));
      return m;
    };
    await indlæs('#/');
    await mål('start');

    // Valg af hold: holdlisten ligger, som når funktionen har svaret med vaelg.
    await gemSvar(undefined, HOLD_URL, VAELG);
    await indlæs('#/hold');
    await mål('valg af hold');
    await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hold 1').click(); true`);
    await vent(50);
    await mål('valg af retning');

    for (const [navn, svar, url, vaelg] of [['par 452', PAR, PAR_URL, undefined], ['hold 450', HOLD, HOLD_URL, VAELG], ['par 3287', PAR_3287, PAR_3287_URL, undefined]]) {
      await gemSvar(svar, url, vaelg);
      await indlæs('#/aften');
      const m = await mål(`aftenen, ${navn}`);
      tjek(m.h1 === svar.turnering.navn, `${bredde} px, aftenen, ${navn}: overskriften er turneringen`, m.h1);
      await tjekInfo(bredde, `aftenen, ${navn}`, svar.turnering.form);
      await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Tabte point')).click(); true`);
      await vent(30);
      await mål(`aftenen, ${navn}, Tabte point`);
      // Vindue 1b, del B: kortet med teknikker og filteret for indspil (de to første testsvar har ét spil med indspil).
      if (navn !== 'par 3287') {
      const teknik = await kør(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.startsWith('Indspil')); b.click(); return { kort: !!document.querySelector('#h-teknikker'), filter: b.textContent.trim() }; })()`);
      await vent(30);
      const vist = await kør(`document.querySelectorAll('.spil-liste li').length`);
      tjek(teknik.kort && teknik.filter === 'Indspil · 1' && vist === 1, `${bredde} px, aftenen, ${navn}: kortet med teknikker står der, og filteret Indspil viser ét spil`, JSON.stringify({ teknik, vist }));
      await mål(`aftenen, ${navn}, Indspil`);
      }
      // SPEC-postmortem-2a: "Spil værd at se på" med "Vis alle" åben (med Enter), valget under Udskriv og mailen.
      await indlæs('#/aften');
      const vis = await kør(`(() => {
        const k = [...document.querySelectorAll('button')].find((b) => /^Vis alle \\(\\d+\\)$/.test(b.textContent.trim()));
        return { kort: !!document.querySelector('#h-vaerd'), knap: k ? k.textContent.trim() : null, før: document.querySelectorAll('.vaerd-liste li').length };
      })()`);
      tjek(vis.kort, `${bredde} px, aftenen, ${navn}: kortet "Spil værd at se på" står der`, JSON.stringify(vis));
      if (vis.knap) {
        await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(vis.knap)}).focus(); true`);
        await tast('Enter', 'Enter', 13);
        const åben = await kør(`({ udvidet: document.activeElement.getAttribute('aria-expanded'), efter: document.querySelectorAll('.vaerd-liste li').length })`);
        const n = Number(/\((\d+)\)/.exec(vis.knap)[1]);
        tjek(åben.udvidet === 'true' && åben.efter === n && vis.før === Math.min(8, n), `${bredde} px, aftenen, ${navn}: "${vis.knap}" åbner med Enter og viser ${n} spil`, JSON.stringify({ vis, åben }));
        await mål(`aftenen, ${navn}, Vis alle åben`);
        await tast('Enter', 'Enter', 13);
        const lukket = await kør(`document.querySelectorAll('.vaerd-liste li').length`);
        tjek(lukket === vis.før, `${bredde} px, aftenen, ${navn}: knappen lukker igen med Enter`, String(lukket));
      }
      await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Udskriv')?.click(); true`);
      await vent(30);
      tjek(await kør(`!!document.querySelector('fieldset.udskriv-valg')`), `${bredde} px, aftenen, ${navn}: Udskriv viser valget af spil`);
      await mål(`aftenen, ${navn}, valget under Udskriv`);
      await gåTil('#/mail');
      const mail = await mål(`mailen, ${navn}`);
      tjek(mail.h1 === 'Aftenen til makker', `${bredde} px, mailen, ${navn}: overskriften er "Aftenen til makker"`, mail.h1);
      // ⓘ ved "Hvor gik pointene?" i analysevinduet (Franks svar 17. nov. 2026).
      await gåTil(`#/spil/${INFO_SPIL[navn]}`);
      await tjekInfo(bredde, `analysevinduet, ${navn}, spil ${INFO_SPIL[navn]}`, svar.turnering.form);
      let værst = 0;
      for (const s of svar.spil) {
        await gåTil(`#/spil/${s.nummer}`);
        const r = await kør(MÅL);
        if (r.h1 !== `Spil ${s.nummer}`) tjek(false, `${bredde} px, ${navn}: spil ${s.nummer} vises`, r.h1);
        if (r.scroll > r.client || r.små.length) {
          værst++;
          tjek(false, `${bredde} px, ${navn}, spil ${s.nummer}: ingen vandret rulning og 44 px trykflader`, `${r.scroll}/${r.client} ${r.ud.join(', ')} ${r.små.join(' | ')}`);
        }
      }
      tjek(værst === 0, `${bredde} px, ${navn}: alle ${svar.spil.length} spil i analysevinduet uden vandret rulning og med 44 px trykflader`);
      // Meldesamtalen: en lukket fold åbner med Enter på dens summary (tastatur).
      await gåTil(`#/spil/${svar.spil.find((s) => s.spillet).nummer}`);
      const fold = await kør(`(() => { const d = document.querySelector('.meldesamtale details:not([open])'); if (!d) return false; d.querySelector('summary').focus(); return true; })()`);
      tjek(fold, `${bredde} px, ${navn}: Meldesamtalen står i analysevinduet med en lukket fold`);
      if (fold) {
        await tast('Enter', 'Enter', 13);
        tjek(await kør(`document.activeElement.parentElement.open === true`), `${bredde} px, ${navn}: en lukket fold i Meldesamtalen åbner med Enter`);
      }
    }

    // Fra 1000 px står bordet til venstre for resten i analysevinduet.
    if (bredde === 1280) {
      await gemSvar(PAR, PAR_URL);
      await indlæs('#/spil/7');
      const s = await kør(`(() => { const b = document.querySelector('figure').getBoundingClientRect(); const v = document.querySelector('.ved-bordet').getBoundingClientRect(); return { bord: b.right, ved: v.left, top: Math.abs(b.top - v.top) < 200 }; })()`);
      tjek(s.bord <= s.ved && s.top, '1280 px: analysevinduet har to spalter med bordet til venstre', JSON.stringify(s));
    }
  }

  if (BILLEDER) {
    for (const bredde of [390, 1280]) {
      await størrelse(bredde, 900);
      await indlæs('#/');
      await kør(`sessionStorage.clear(); true`);
      await indlæs('#/');
      await billede(`${bredde}-start.png`);
      await gemSvar(undefined, HOLD_URL, VAELG);
      await indlæs('#/hold');
      await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Hold 1').click(); true`);
      await vent(50);
      await billede(`${bredde}-hold.png`);
      await gemSvar(PAR, PAR_URL);
      await indlæs('#/aften');
      await billede(`${bredde}-aften-par.png`);
      await indlæs('#/spil/7');
      await billede(`${bredde}-spil-7.png`);
      await gemSvar(HOLD, HOLD_URL, VAELG);
      await indlæs('#/aften');
      await billede(`${bredde}-aften-hold.png`);
      await indlæs('#/spil/4');
      await billede(`${bredde}-hold-spil-4.png`);
      // Vindue 1b, del B: de tre spil med mærker.
      await indlæs('#/spil/9');
      await billede(`${bredde}-450-spil-9.png`);
      await gemSvar(PAR, PAR_URL);
      await indlæs('#/spil/3');
      await billede(`${bredde}-452-spil-3.png`);
      await indlæs('#/spil/18');
      await billede(`${bredde}-452-spil-18.png`);
    }
    // SPEC-postmortem-1d-point.md: oversigten for 16. november med ⓘ lukket og åben.
    for (const bredde of [320, 390, 1280]) {
      await størrelse(bredde, 900);
      await gemSvar(PAR_3287, PAR_3287_URL);
      await indlæs('#/aften');
      await billede(`${bredde}-aften-3287.png`);
      await tilInfo();
      await mus();
      await kør('window.scrollTo(0, 0); true');
      await billede(`${bredde}-aften-3287-info.png`);
    }
    // Franks svar 17. nov. 2026: ⓘ åben ved holdturnering (oversigten) og i analysevinduet ved begge former.
    for (const bredde of [390, 1280]) {
      await størrelse(bredde, 900);
      for (const [fil, svar, url, vaelg, hash] of [
        ['aften-hold-450-info', HOLD, HOLD_URL, VAELG, '#/aften'],
        ['analysevindue-par-3287-spil-32-info', PAR_3287, PAR_3287_URL, undefined, '#/spil/32'],
        ['analysevindue-hold-450-spil-4-info', HOLD, HOLD_URL, VAELG, '#/spil/4'],
      ]) {
        await gemSvar(svar, url, vaelg);
        await indlæs(hash);
        await tilInfo();
        await mus();
        await kør('window.scrollTo(0, 0); true');
        await billede(`${bredde}-${fil}.png`);
      }
    }
    // SPEC-postmortem-2a: det nye for 16. november ved 390 og 1280 px.
    for (const bredde of [390, 1280]) {
      await størrelse(bredde, 900);
      await gemSvar(PAR_3287, PAR_3287_URL);
      await indlæs('#/aften');
      await billede(`2a-${bredde}-1-aften-hele-siden.png`);
      await elementBillede(`2a-${bredde}-1-spil-vaerd-at-se-paa-8-spil-og-uheldige.png`, '.vaerd');
      await elementBillede(`2a-${bredde}-1-linjen-med-de-uheldige.png`, '.vaerd-uheldige');
      await kør(`[...document.querySelectorAll('button')].find((b) => /^Vis alle/.test(b.textContent.trim())).click(); true`);
      await vent(50);
      await elementBillede(`2a-${bredde}-1-vis-alle-18-aaben.png`, '.vaerd');
      await kør(`document.querySelector('.vaerd details').open = true; true`);
      await vent(50);
      await elementBillede(`2a-${bredde}-1-hvorfor-er-et-spil-med.png`, '.vaerd details');
      await indlæs('#/aften');
      await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Udskriv').click(); true`);
      await vent(50);
      await elementBillede(`2a-${bredde}-1-knapperne-og-valget-under-udskriv.png`, '.del-aftenen');
      for (const nr of [1, 17]) {
        await indlæs(`#/spil/${nr}`);
        await elementBillede(`2a-${bredde}-2-meldesamtalen-spil-${nr}.png`, '.meldesamtale');
      }
      await indlæs('#/mail');
      await billede(`2a-${bredde}-3-mail-spil-vaerd-at-se-paa.png`);
    }
    console.log(`Skærmbillederne ligger i ${BILLEDER}`);
  }
} catch (e) {
  tjek(false, 'testen kørte færdig', e.stack ?? e.message);
} finally {
  proc.kill();
  await server.close();
  await vent(300);
  try { rmSync(profil, { recursive: true, force: true }); } catch {}
}
console.log(fejl ? `\n${fejl} FEJL` : '\nAlt i orden');
process.exit(fejl ? 1 : 0);
