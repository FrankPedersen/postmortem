# Post Mortem

Post Mortem (PM) er makkerparrets gennemgang af egne spil bagefter. Brugeren indsætter et link fra resultater.bridge.dk, og appen viser for hvert spil, hvad der kunne vindes dobbeltdummy, og hvor parret vandt eller tabte i forhold til feltet: meldinger, spilføring, modspil og held.

Appen kommer på www.kontraktbridge.dk/postmortem/. Al beregning sker i en Azure Function (`api/`); appen viser kun svaret.

Planen står i [docs/specs/PLAN-postmortem.md](docs/specs/PLAN-postmortem.md), og hvert trin har sin egen spec i `docs/specs/`.

## Appen (roden)

Vite, React og TypeScript som Fordelingstræneren; tests med vitest og Testing Library (SPEC-postmortem-1c-app.md).

- `src/App.tsx` styrer adresserne: `#/` start, `#/hold` valg af hold, `#/aften` aftenens oversigt og `#/spil/<nr>` analysevinduet.
- `src/api.ts` har funktionens adresse ét sted og tjekker, at linket begynder med `https://resultater.bridge.dk/`. Under udvikling går kaldet gennem Vites proxy (`vite.config.ts`).
- `src/tekster.ts` har alle tekster (kun dansk i første udgave), `src/format.ts` tal, kort og kontrakter på dansk, og `src/udledt.ts` det, appen udleder af svaret (mærker, middel, feltets grupper, hp).
- `src/styles.css` har tokens, topbjælke og sidefod kopieret fra Fordelingstræneren; fontene og licenserne ligger i `public/fonts/`.
- Svaret ligger kun i `sessionStorage` (`src/lager.ts`), så en genindlæsning ikke kræver et nyt kald. Ingen aftener gemmes.

### Lokalt

```bash
npm install
npm run dev                  # http://localhost:5173/ – kaldene går gennem proxyen til funktionen i Azure
npm test                     # tsc og vitest: accepttestene i src/test/ med svarene i src/test/data/
node tools/tjek_bredde.mjs   # i Chrome eller Edge: ingen vandret rulning ved 320, 390 og 1280 px, 44 px trykflader
node tools/tjek_bredde.mjs --billeder=../skaermbilleder/app   # gemmer også skærmbilleder af skærmene
```

`src/test/data/` er svar fra funktionen på de anonymiserede testsider i `api/tests/data/` (ingen rigtige navne). De laves igen fra `api/` med `.venv` sådan:

```bash
cd api
.venv/Scripts/python -c "import json,sys; sys.path.insert(0,'tests'); from conftest import GemteSider,PAR_URL,HOLD_URL; from postmortem.analyse import analyser; from postmortem import cache; k=cache.fra_miljoe(); [open(f'../src/test/data/{n}.json','w',encoding='utf-8').write(json.dumps(analyser(b,hent=GemteSider(),cache=k)[1],ensure_ascii=False,indent=1)+'\n') for n,b in [('par-452',{'url':PAR_URL}),('hold-450-vaelg',{'url':HOLD_URL}),('hold-450',{'url':HOLD_URL,'hold':'2-NS'})]]"
```

### Udgivelse

`.github/workflows/pages.yml` kører `npm test` og bygger med `--base=/postmortem/` ved hvert push til `main` og udgiver på GitHub Pages (Settings → Pages → Source: GitHub Actions). Siden ligger under samme domæne som forsiden, fordi `frankpedersen.github.io` har domænet www.kontraktbridge.dk.

## Funktionen (`api/`)

**Adresse:** `https://kontraktbridge-postmortem.azurewebsites.net/api/analyse`

`POST /api/analyse` med `{ "url": "…" }` (et link til Bordresultater eller Personligt regnskab på resultater.bridge.dk). Svaret er beskrevet i [api/SVAR.md](api/SVAR.md).

- Python 3.12, Azure Functions v2-programmeringsmodellen og `endplay` 0.5.12 (DDS). Python 3.14 kan ikke bruges, fordi `endplay` ikke har hjul til den.
- `postmortem/laes.py` læser siderne, `regn.py` regner DD, par, scorer (§ 77), imp (§ 78B) og matchpoint (§ 78A), `analyse.py` samler de fire faktorer, og `cache.py` gemmer DD-beregningerne (Blob i Azure, en mappe lokalt).
- Ingen spillernavne i svaret, loggen eller cachen; kun holdlisten til valg af hold har holdnavne.
- Højst 10 analyser pr. IP pr. 10 minutter (holdlisten tæller ikke), i hukommelsen pr. instans som i kontakt-API'et; derover 429 "For mange analyser lige nu. Prøv igen om lidt." med `Retry-After`. IP'en logges ikke (`function_app.py`, `tests/test_graense.py`).

### Lokalt

```bash
cd api
py -3.12 -m venv .venv            # eller en anden Python 3.12
.venv/Scripts/python -m pip install -r requirements.txt -r requirements-dev.txt
.venv/Scripts/python -m pytest -q  # tests på de gemte sider i tests/data/, ingen net
```

Siderne i `tests/data/` er anonymiserede med `tests/anonymiser.py`: spillerne hedder "Spiller n" og holdene "Hold n", og alt andet er som på bridge.dk. De rigtige sider kommer ikke i repoet.

Funktionen kan køres lokalt med Azure Functions Core Tools 4 (`npm install -g azure-functions-core-tools@4` eller en lokal installation). Det virtuelle miljø skal være aktiveret, ellers vælger Core Tools en anden Python:

```bash
cd api
cp local.settings.example.json local.settings.json   # står i .gitignore
source .venv/Scripts/activate                         # Git Bash; i PowerShell .venv\Scripts\Activate.ps1
func start
curl -X POST http://localhost:7071/api/analyse -H "Content-Type: application/json" \
  -d '{"url": "https://resultater.bridge.dk/template/personligt_regnskab.php?filename=2151/MT452GT720.XML&tournament=452&section=1&pairno=1"}'
```

Uden `AzureWebJobsStorage` gemmes DD-beregningerne i en mappe (`POSTMORTEM_CACHE_DIR` eller systemets midlertidige mappe).

### Tests på Linux

`.github/workflows/api.yml` kører testene på `ubuntu-latest` med Python 3.12 ved hvert push.

### Azure

Ressourcegruppen `Kontraktbridge` i West Europe:

- Function App `kontraktbridge-postmortem`: Flex Consumption, Linux, Python 3.12, 2048 MB pr. instans og højst 10 instanser. Anonym; CORS kun for `https://www.kontraktbridge.dk` og `https://kontraktbridge.dk`, sat i platformen (`az functionapp cors add`).
- Lagerkonto `kontraktbridgepostmortem`: funktionens egen (`AzureWebJobsStorage`). DD-cachen ligger i blob-containeren `postmortem-dd`, som funktionen selv opretter ved første kald.
- Application Insights `kontraktbridge-postmortem` i Log Analytics-arbejdsområdet `kontraktbridge-kontakt-logs` (30 dage). Loggen har kun sidetype, status, antal spil og tid.

### Udrulning

Ikke med push. Zip med `/`-stier og fjernbygning, som kontakt-API'et (`Forside/_kontakt-api/README.md`). Zip-filen skrives uden for repoet:

```bash
cd api
python -c "import zipfile,pathlib; z=zipfile.ZipFile('../../postmortem.zip','w',zipfile.ZIP_DEFLATED); [z.write(p,p) for p in ['function_app.py','host.json','requirements.txt',*[f.as_posix() for f in pathlib.Path('postmortem').glob('*.py')]]]; z.close()"
az functionapp deployment source config-zip -g Kontraktbridge -n kontraktbridge-postmortem --src ../../postmortem.zip --build-remote true
```

Windows PowerShells `Compress-Archive` skriver `\` i stierne, og så finder Azure (Linux) ingen funktioner. I Git Bash skal `MSYS_NO_PATHCONV=1` sættes, når `az` får ressource-id'er.

## Licenser

Dobbeltdummy-beregningen bruger DDS af Bo Haglund og Soren Hein (Apache 2.0) gennem endplay af Dominic Price (MIT).
