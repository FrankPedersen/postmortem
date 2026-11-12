# Post Mortem

Bridge-app til makkerparrets gennemgang af egne spil fra resultater.bridge.dk. Repo: `FrankPedersen/postmortem`. Appen kommer på www.kontraktbridge.dk/postmortem/ (GitHub Pages, vindue 1c); beregningen ligger i en Azure Function i `api/` (vindue 1a).

**Planen står i [docs/specs/PLAN-postmortem.md](docs/specs/PLAN-postmortem.md), og hvert vindue har sin spec i `docs/specs/`. Læs den relevante spec før en ændring**, og følg den frem for egne antagelser.

Det, der gælder alle repoer – arbejdsgangen, husets ord, hemmeligheder og systemdokumentationen `../SYSTEM.md` – står i `../CLAUDE.md`.

## Arbejdsgang

- En ændring beskrives først i en spec med afgrænsning, accepttest og Afklaret. En spec i arbejde ligger i `docs/specs/`; når den er udgivet, får den en linje i `docs/specs/README.md`.
- Ændringen bygges på en gren, aldrig direkte på `main`. `main`, som den står før ændringen, tagges `v-foer-<gren>`.
- Accepttestene skrives, før ændringen bygges, og ændringen er færdig, når de og repoets øvrige tests er grønne.
- **Ingen push til `main` og ingen Azure-ressourcer eller deploy uden Franks godkendelse.** Claude Code stopper før fletning.

## Funktionen (`api/`)

- Python 3.12, Azure Functions v2-programmeringsmodellen, `endplay` 0.5.12 (DDS). Python 3.14 kan ikke bruges, fordi endplay ikke har hjul til den.
- Tests: `pytest` i `api/tests/` på gemte sider fra resultater.bridge.dk i `api/tests/data/`. Ingen test henter fra nettet. `.github/workflows/api.yml` kører dem på Linux ved hvert push.
- **Rigtige navne må aldrig i git.** En ny testside fra bridge.dk gemmes først uden for repoet (fx `../_lab/`), anonymiseres med `api/tests/anonymiser.py` (spillere bliver "Spiller n", hold "Hold n"), og kun den anonymiserede side lægges i `api/tests/data/`. `tests/test_ingen_navne.py` tjekker det lokalt.
- DDS' stiktal gælder den side, der er i tur: efter udspillet er det spilførersidens og skal ikke vendes (`docs/specs/NOTAT-afproevning.md`).
- Svaret er beskrevet i `api/SVAR.md`. Ingen spillernavne i svaret, i loggen eller i cachen; kun holdlisten til valg af hold har holdnavne.
- Hemmeligheder (forbindelsesstrenge) står kun i Function App'ens indstillinger; `local.settings.json` er i `.gitignore`.

## Sprog

- Dansk tekst følger husets ord og beskrivende form (`../CLAUDE.md`): bordet, slutspil, skvis, kipning, forbindelser, indkassere, toppe farven.
