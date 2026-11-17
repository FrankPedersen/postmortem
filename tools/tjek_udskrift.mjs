// Accepttest 4 i SPEC-postmortem-2a-vaerd-at-se-paa.md: udskriften i Chrome uden vindue (A4). Aftenen 16. november
// (src/test/data/par-3287.json) udskrives med "Spil værd at se på" og med "Alle spil", og testen tjekker:
//   - knappen Udskriv lader brugeren vælge og åbner browserens print (window.print);
//   - PDF'en har side 1 og én side pr. spil (9 og 33 sider), i A4;
//   - hver side begynder på en ny side og er højst én A4-side høj, og rammen med beslutning, årsag og ny aftale har
//     break-inside: avoid, så den aldrig deles over to sider (en side, der løb over, ville give en side mere);
//   - menu, sidefod, knapper og skærmens indhold er skjult;
//   - kun ♥ og ♦ er røde; al anden tekst er sort.
//
//   node tools/tjek_udskrift.mjs              tjekker udskriften
//   node tools/tjek_udskrift.mjs --pdf=fil    gemmer også "Alle spil" med side 1, spil 1 og spil 7 som PDF
//
// Samme teknik som tools/tjek_bredde.mjs: Vites udviklingsserver og Chrome eller Edge styret over DevTools, med svaret i
// sessionStorage som efter en analyse. Kræver Node 22+. Stien til browseren kan gives i CHROME.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROD = fileURLToPath(new URL('..', import.meta.url));
const PDF = process.argv.find((a) => a.startsWith('--pdf='))?.slice('--pdf='.length);
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

const SVAR = JSON.parse(readFileSync(join(ROD, 'src', 'test', 'data', 'par-3287.json'), 'utf8'));
const URL_3287 = 'https://resultater.bridge.dk/template/personligt_regnskab.php?filename=1111/MT3287GT11912.XML&tournament=3287&section=7&pairno=1';
const NØGLE = 'postmortem';
// A4 med 12 mm margen: 186 × 273 mm indhold, 96 px pr. tomme.
const MM = 96 / 25.4;
const INDHOLD = { bredde: Math.floor(186 * MM), højde: 273 * MM };

const vent = (ms) => new Promise((r) => setTimeout(r, ms));
let fejl = 0;
const tjek = (ok, navn, detalje = '') => {
  if (!ok) fejl++;
  console.log(`${ok ? 'ok  ' : 'FEJL'} ${navn}${!ok && detalje ? ` – ${detalje}` : ''}`);
};

const server = await createServer({ root: ROD, configFile: join(ROD, 'vite.config.ts'), logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const BASE = server.resolvedUrls.local[0];
const profil = mkdtempSync(join(tmpdir(), 'pm-udskrift-'));
const port = 9800 + Math.floor(Math.random() * 500);
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
  let indlæsning = 0;
  const indlæs = async (hash) => {
    await send('Page.navigate', { url: `${BASE}?n=${++indlæsning}${hash}` });
    for (let i = 0; i < 100; i++) {
      await vent(100);
      if (await kør(`document.readyState === 'complete' && !!document.querySelector('main h1')`).catch(() => false)) break;
    }
    await kør('document.fonts.ready.then(() => true)');
  };

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await indlæs('#/');
  await kør(`sessionStorage.setItem(${JSON.stringify(NØGLE)}, ${JSON.stringify(JSON.stringify({ url: URL_3287, svar: SVAR }))}); true`);

  for (const [valg, radio, sider] of [['spil værd at se på', 'Spil værd at se på (8)', 9], ['alle spil', 'Alle 32 spil', 33]]) {
    await send('Emulation.setEmulatedMedia', { media: 'screen' });
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await indlæs('#/aften');
    // Knappen Udskriv: valget og browserens print (window.print erstattes, så Chrome ikke venter på en dialog).
    const valgt = await kør(`(async () => {
      window.__print = 0; window.print = () => { window.__print++; };
      const knap = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Udskriv');
      if (!knap) return { fejl: 'ingen knap Udskriv' };
      knap.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      const r = [...document.querySelectorAll('input[type=radio]')].find((x) => x.labels[0]?.textContent.trim() === ${JSON.stringify(radio)});
      if (!r) return { fejl: 'intet valg ' + ${JSON.stringify(radio)} };
      r.click();
      await new Promise((r) => requestAnimationFrame(() => r()));
      [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Udskriv nu').click();
      return { print: window.__print, sider: document.querySelectorAll('.udskrift .udskrift-side').length };
    })()`);
    tjek(!valgt.fejl && valgt.print === 1 && valgt.sider === sider, `${valg}: Udskriv lader brugeren vælge og åbner browserens print`, JSON.stringify(valgt));

    // Printmediet med A4's bredde: det, der skjules, sideskiftene, højden og farverne.
    await send('Emulation.setDeviceMetricsOverride', { width: INDHOLD.bredde, height: 1100, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { media: 'print' });
    await vent(100);
    const m = await kør(`(() => {
      const synlig = (e) => !!e && e.checkVisibility();
      const skjult = { menu: !synlig(document.querySelector('.topbar')), sidefod: !synlig(document.querySelector('.site-footer')),
        knapper: [...document.querySelectorAll('button, a[href]')].filter(synlig).map((e) => e.textContent.trim().slice(0, 30)),
        skærm: !synlig(document.querySelector('main')) };
      const sider = [...document.querySelectorAll('.udskrift-side')];
      const stil = (e) => getComputedStyle(e);
      const høje = sider.map((s, i) => [i + 1, s.getBoundingClientRect().height, s.scrollHeight - s.clientHeight]).filter(([, h, over]) => h > ${INDHOLD.højde} + 0.5 || over > 1);
      const skift = sider.slice(1).filter((s) => stil(s).breakBefore !== 'page').length;
      const rammer = [...document.querySelectorAll('.udskrift-ramme, .udskrift-aftale')];
      const deles = rammer.filter((r) => stil(r).breakInside !== 'avoid').length;
      const kortHele = sider.slice(1).filter((s) => stil(s).breakInside !== 'avoid').length;
      // Farverne: hver tekst er sort, undtagen ♥ og ♦, der er røde.
      const sort = 'rgb(0, 0, 0)';
      const farvefejl = [];
      const gå = document.createTreeWalker(document.querySelector('.udskrift'), NodeFilter.SHOW_TEXT);
      for (let n = gå.nextNode(); n; n = gå.nextNode()) {
        const t = n.textContent;
        if (!t.trim()) continue;
        const farve = stil(n.parentElement).color;
        for (const tegn of t.replace(/\\s/g, '')) {
          const rød = tegn === '♥' || tegn === '♦';
          if (rød ? farve === sort || !/^rgb\\((1[5-9]\\d|2\\d\\d), (\\d|[1-7]\\d), (\\d|[1-7]\\d)\\)$/.test(farve) : farve !== sort) {
            farvefejl.push(tegn + ' ' + farve + ' i "' + t.trim().slice(0, 30) + '"');
            break;
          }
        }
      }
      const røde = [...document.querySelectorAll('.udskrift *')].filter((e) => e.childElementCount === 0 && /[♥♦]/.test(e.textContent)).length;
      return { skjult, sider: sider.length, høje, skift, rammer: rammer.length, deles, kortHele, farvefejl: farvefejl.slice(0, 5), antalFarvefejl: farvefejl.length, røde };
    })()`);
    tjek(m.sider === sider, `${valg}: side 1 og én side pr. spil i dokumentet (${sider})`, String(m.sider));
    tjek(m.skjult.menu && m.skjult.sidefod && m.skjult.skærm && m.skjult.knapper.length === 0, `${valg}: menu, sidefod, knapper og skærmens indhold er skjult`, JSON.stringify(m.skjult));
    tjek(m.høje.length === 0, `${valg}: hver side er højst én A4-side (273 mm) og løber ikke over`, JSON.stringify(m.høje.slice(0, 5)));
    tjek(m.skift === 0 && m.kortHele === 0, `${valg}: hvert spil begynder på en ny side og har break-inside: avoid`, JSON.stringify(m));
    tjek(m.rammer === 2 * (sider - 1) && m.deles === 0, `${valg}: rammen med beslutning og årsag og feltet med ny aftale deles aldrig (break-inside: avoid)`, JSON.stringify({ rammer: m.rammer, deles: m.deles }));
    tjek(m.antalFarvefejl === 0 && m.røde > 0, `${valg}: kun ♥ og ♦ er røde, alt andet er sort`, `${m.antalFarvefejl}: ${m.farvefejl.join(' | ')}`);

    // PDF'en: antal sider og A4.
    const pdf = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true });
    const bytes = Buffer.from(pdf.result.data, 'base64');
    const tekst = bytes.toString('latin1');
    const antal = (tekst.match(/\/Type\s*\/Page(?!s)/g) || []).length;
    const boks = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(tekst);
    tjek(antal === sider, `${valg}: PDF'en har ${sider} sider (side 1 og én pr. spil)`, `${antal} sider`);
    tjek(boks && Math.abs(Number(boks[1]) - 595.3) < 2 && Math.abs(Number(boks[2]) - 841.9) < 2, `${valg}: PDF'en er A4`, boks?.[0]);

    if (PDF && valg === 'alle spil') {
      // Side 1, spil 1 (side 2) og spil 7 (side 8).
      const udsnit = await send('Page.printToPDF', { preferCSSPageSize: true, printBackground: true, pageRanges: '1-2,8' });
      mkdirSync(dirname(PDF), { recursive: true });
      writeFileSync(PDF, Buffer.from(udsnit.result.data, 'base64'));
      console.log(`PDF'en med side 1, spil 1 og spil 7 ligger i ${PDF}`);
    }
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
