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

## Appen (roden)

- Vite, React og TypeScript som Fordelingstræneren (SPEC-postmortem-1c-app.md). `npm test` kører `tsc` og vitest: accepttestene i `src/test/` bruger svarene i `src/test/data/`, som er lavet af funktionen på de anonymiserede sider (README viser hvordan); `api/tests/test_ingen_navne.py` tjekker også dem.
- `node tools/tjek_bredde.mjs` tjekker i Chrome eller Edge, at ingen skærm ruller vandret ved 320, 390 og 1280 px, at knapper og links har 44 px trykflade, og at bordet står i to spalter fra 1000 px; `--billeder=mappe` gemmer skærmbilleder.
- Alle tekster står i `src/tekster.ts`. Funktionens adresse står kun i `src/api.ts`. Ingen PWA og ingen gemte aftener; svaret ligger kun i `sessionStorage`.
- `.github/workflows/pages.yml` udgiver appen ved push til `main`; funktionen udrulles kun med zip (README).

## Sprog

- Dansk tekst følger husets ord og beskrivende form (`../CLAUDE.md`): bordet, slutspil, skvis, kipning, forbindelser, indkassere, toppe farven.
- Fagordstesten og bydeformtesten er `src/test/sprog.test.tsx` (i `npm test`) med listerne i `src/sprog/fagord.ts` og `src/sprog/bydeform.ts`; de læser al tekst på alle skærme og hele `src/tekster.ts`. En ny knap i bydeform kommer på `UNDTAGELSER`.
