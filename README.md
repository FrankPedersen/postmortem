# Post Mortem

Post Mortem (PM) er makkerparrets gennemgang af egne spil bagefter. Brugeren indsætter et link fra resultater.bridge.dk, og appen viser for hvert spil, hvad der kunne vindes dobbeltdummy, og hvor parret vandt eller tabte i forhold til feltet: meldinger, spilføring, modspil og held.

Appen kommer på www.kontraktbridge.dk/postmortem/. Al beregning sker i en Azure Function (`api/`); appen viser kun svaret.

Planen står i [docs/specs/PLAN-postmortem.md](docs/specs/PLAN-postmortem.md), og hvert trin har sin egen spec i `docs/specs/`.

## Funktionen (`api/`)

**Adresse:** `https://kontraktbridge-postmortem.azurewebsites.net/api/analyse`

`POST /api/analyse` med `{ "url": "…" }` (et link til Bordresultater eller Personligt regnskab på resultater.bridge.dk). Svaret er beskrevet i [api/SVAR.md](api/SVAR.md).

- Python 3.12, Azure Functions v2-programmeringsmodellen og `endplay` 0.5.12 (DDS). Python 3.14 kan ikke bruges, fordi `endplay` ikke har hjul til den.
- `postmortem/laes.py` læser siderne, `regn.py` regner DD, par, scorer (§ 77), imp (§ 78B) og matchpoint (§ 78A), `analyse.py` samler de fire faktorer, og `cache.py` gemmer DD-beregningerne (Blob i Azure, en mappe lokalt).
- Ingen spillernavne i svaret, loggen eller cachen; kun holdlisten til valg af hold har holdnavne.

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
