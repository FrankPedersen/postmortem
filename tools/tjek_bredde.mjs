// Accepttest 6 i en rigtig browser (SPEC-postmortem-1c-app.md): ingen vandret rulning ved 320 px på start, valg af hold,
// aftenens oversigt og analysevinduet for hvert spil i begge testsvar, og alle knapper og links har en trykflade på mindst
// 44 × 44 px. Samme teknik som Forsidens tools/tjek_bredde.mjs: Chrome eller Edge uden vindue, styret over DevTools.
//
//   node tools/tjek_bredde.mjs                   tjekker ved 320, 390 og 1280 px (og at intet ligger oven i kompasset)
//   node tools/tjek_bredde.mjs --billeder=mappe  gemmer også skærmbilleder af skærmene ved 390 og 1280 px
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

    for (const [navn, svar, url, vaelg] of [['par 452', PAR, PAR_URL, undefined], ['hold 450', HOLD, HOLD_URL, VAELG]]) {
      await gemSvar(svar, url, vaelg);
      await indlæs('#/aften');
      const m = await mål(`aftenen, ${navn}`);
      tjek(m.h1 === svar.turnering.navn, `${bredde} px, aftenen, ${navn}: overskriften er turneringen`, m.h1);
      await kør(`[...document.querySelectorAll('button')].find((b) => b.textContent.startsWith('Tabte point')).click(); true`);
      await vent(30);
      await mål(`aftenen, ${navn}, Tabte point`);
      // Vindue 1b, del B: kortet med teknikker og filteret for indspil (begge testsvar har ét spil med indspil).
      const teknik = await kør(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.startsWith('Indspil')); b.click(); return { kort: !!document.querySelector('#h-teknikker'), filter: b.textContent.trim() }; })()`);
      await vent(30);
      const vist = await kør(`document.querySelectorAll('.spil-liste li').length`);
      tjek(teknik.kort && teknik.filter === 'Indspil · 1' && vist === 1, `${bredde} px, aftenen, ${navn}: kortet med teknikker står der, og filteret Indspil viser ét spil`, JSON.stringify({ teknik, vist }));
      await mål(`aftenen, ${navn}, Indspil`);
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
