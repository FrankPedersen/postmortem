# SPEC – Post Mortem, vindue 1a: funktionen

12. november 2026 · Frank. **Model: Opus.** Plan: `PLAN-postmortem.md`. Afprøvning: `_lab/postmortem-0/NOTAT-afproevning.md`. Mockup: designlærredet "Post Mortem – mockup".

## Formål

En Azure Function, der tager et link fra resultater.bridge.dk og svarer med alt, hvad Post Mortem skal vise, undtagen mærkerne for skvis, slutspil og nøglebeslutninger (de kommer i vindue 1b): spillene, DD-tabellen, par, udspilseffekten og de fire faktorer pr. spil og for aftenen. Appen (vindue 1c) skal kun vise svaret.

## Repo og afgrænsning

- **Nyt repo `postmortem`** under Franks GitHub-konto, offentligt som de andre (GitHub Pages i vindue 1c). Lokalt i `C:\Users\frank\Kontraktbridge\Postmortem\`. Første commit på `main` er kun `README.md`, `.gitignore`, `CLAUDE.md` (kopi af arbejdsgangen fra Fordelingstrænerens `CLAUDE.md`, tilpasset) og `docs/specs/` med `PLAN-postmortem.md`, denne spec og afprøvningens notat. Tag det `v-foer-funktion`. Alt andet sker på grenen `funktion`.
- **Funktionen ligger i `api/`**: Python 3.12, Azure Functions v2-programmeringsmodellen, `endplay` 0.5.12 (DDS, Apache 2.0; endplay, MIT). Appen kommer i roden i vindue 1c.
- **Ingen andre repoer røres.** `_lab/postmortem-0/` er kun til at læse fra (testsider og PBN).
- **Ingen Azure-ressourcer oprettes, og intet deployes, før Frank har godkendt grenen.** Trin 6 nedenfor sker først efter "godkendt".
- Kræver noget alligevel en ændring ud over dette, stopper Claude Code og spørger.

## Indgang og sidetyper

`POST /api/analyse` med JSON `{ "url": "…" }`.

- Kun `https://resultater.bridge.dk/…` accepteres; alt andet giver 400 med "Det er ikke et link fra resultater.bridge.dk". Funktionen henter kun fra den vært og følger ikke omdirigeringer til andre værter.
- **Holdturnering:** `multihold_bordresultater.php` (spil, hænder via Bridge Solver-linket, kontrakt, spilfører, udspil, stik og score ved alle borde). Linket siger ikke, hvilket hold der er brugerens, så svaret har en liste over holdene, og appen spørger (felt `vaelg`), før analysen vises. Et andet kald med `{ "url": "…", "hold": "<id>" }` giver analysen for det hold.
- **Parturnering:** `personligt_regnskab.php` (parret fra `pairno`). Hænderne hentes fra kortfordelingen og feltets resultater fra spilresultaterne for samme turnering og sektion; funktionen bygger de adresser selv ud fra `filename`, `tournament` og `section`. De gemte sider fra turnering 452 (`personligt-regnskab-452.html`, `kortfordeling-452.html`, `spilresultater-452.html`) er testdata.
- Andre sidetyper (scoresheet, startliste osv.) giver 400 med "Brug Bordresultater eller Personligt regnskab".
- Fejl fra bridge.dk (timeout, 5xx) giver 502 med "bridge.dk svarer ikke lige nu". En side uden spil giver 422 med "Siden har ingen spil".
- XML-filen kan ikke hentes (afprøvningen); HTML'en læses.

## Beregningen pr. spil

For hvert spil:

1. **Hænderne** fra Bridge Solver-linket (`north=…&east=…&south=…&west=…`, `dealer`, `vul`). Den DD-tabel, bridge.dk selv viser, læses også; afviger den fra endplays, er spillet markeret `ddAfvigelse: true` og kommer med i en test, der skal være grøn.
2. **DD-tabel og par** med endplay.
3. **DD før og efter udspil** for den kontrakt, der blev spillet ved brugerens bord. DDS' tal gælder den side, der er i tur: efter udspillet er det spilførersidens og skal ikke vendes (afprøvningen, Afklaret 3).
4. **Scorer**, alle fra brugerens side, efter § 77 (Love for Turneringsbridge 2017):
   - `S_faktisk`: scoren ved bordet.
   - `S_ddEfter`: scoren for samme kontrakt med DD-max efter det faktiske udspil.
   - `S_ddFoer`: scoren for samme kontrakt med DD-max før udspil.
   - `S_par`: par-scoren.
5. **Point** for en score regnes mod feltets faktiske scorer på spillet: i parturnering matchpoint efter § 78A på sidens egen skala (0–10 ved 6 borde, dvs. 2 pr. slået score, 1 pr. lige) i den retning, parret sad; i holdturnering imp mod holdkammeraternes score ved det andet bord efter imp-skalaen i § 78B. `P(S)` er pointene for scoren S.
6. **De fire faktorer** (teleskopsum, så de lægger op til resultatet mod middel):
   - **Spilføring** (parret spilfører) eller **modspil i spillet** (parret i modspil): `P(S_faktisk) − P(S_ddEfter)`.
   - **Udspil**: kun når parret var i modspil: `P(S_ddEfter) − P(S_ddFoer)`; lægges til Modspil. Når parret var spilfører, hører udspillet under Held og uheld.
   - **Meldinger (begge sider)**: `P(S_ddFoer) − P(S_par)`.
   - **Held og uheld**: `P(S_par) − middel` (middel = halvdelen af toppen i parturnering, 0 imp i holdturnering), plus modpartens udspil, når parret var spilfører.
   - Summen af de fire skal være `P(S_faktisk) − middel`; det er en accepttest pr. spil.
7. **Aftenen**: summen af hver faktor over alle spil, og "største forbedring" = den faktor (af Meldinger, Spilføring og Modspil) med det mest negative tal.

Spil uden resultat ved brugerens bord (fx "M" i regnskabet) tages med uden faktorer og markeres `spillet: false`.

## Svaret

Ét JSON-dokument, beskrevet i `api/SVAR.md` og valideret af en test. Mindst: turnering (navn, dato, form: par/hold, skala), parret eller holdet (nummer, ingen navne), procent eller imp for aftenen, de fire faktorsummer, og en liste over spil med: nummer, giver, zone, de fire hænder, DD-tabel, par, kontrakt, spilfører, udspil, stik, score, point, procent, feltets scorer (uden navne), DD før/efter udspil, de fire faktorer og `maerker: []` (tom indtil vindue 1b).

**Navne:** holdlisten til valget i trin "Holdturnering" må have holdnavne, fordi brugeren skal kunne finde sit hold. Ellers er der ingen navne i svaret, og ingen navne logges eller gemmes.

## Cache

DD-beregningerne (tabel, par, før/efter udspil) gemmes i Function App'ens egen lagerkonto (Blob, `AzureWebJobsStorage`), nøgle = turnering + sektion + spil + kontrakt + udspil, uden navne. Siderne fra bridge.dk hentes hver gang (de er billige), så faktorerne altid regnes på de aktuelle resultater. Lokalt bruges Azurite eller en fil-cache bag samme grænseflade.

## Tests

- `pytest` i `api/tests/` på de gemte sider (kopieret fra `_lab/postmortem-0/bridgedk/` til `api/tests/data/`) og `testspil.pbn`. Ingen test henter fra nettet.
- **GitHub Actions** (`.github/workflows/api.yml`) kører testene på `ubuntu-latest` med Python 3.12 ved hvert push. Det er Linux-testen, afprøvningen manglede.
- Accepttest, skrevet før koden:
  1. Bordresultater 450: alle spil læses; endplays DD-tabel = sidens for alle spil; listen over hold vises; analysen for ét valgt hold har faktorer, der summerer rigtigt på hvert spil.
  2. Personligt regnskab 452: parret læses fra `pairno`; procent for aftenen = sidens (inden for 0,1); faktorerne summerer rigtigt; spil uden resultat er `spillet: false`.
  3. `testspil.pbn`: DD før/efter udspil som i afprøvningen (spil 1: 8 og 9; spil 2: 9 og 9; spil 3: 7 og 7).
  4. Ugyldige adresser og sidetyper giver de rigtige statuskoder og tekster.
  5. Svaret indeholder ingen navne uden for holdlisten (test, der søger efter navnene fra testsiderne).
  6. 32 spil analyseres på under 30 sekunder i Actions uden cache.

## Trin

1. Repo, første commit, tag `v-foer-funktion`, gren `funktion`.
2. Accepttestene (røde).
3. Læsning af de to sidetyper.
4. DD, scorer, point og faktorer.
5. Cache, fejlsvar, `SVAR.md`, README med lokal kørsel. Actions grøn. **Stop før merge og før Azure.**
6. **Efter Franks godkendelse:** merge til `main`; opret Function App `kontraktbridge-postmortem` (Linux, Python 3.12, Flex Consumption eller almindelig Consumption, hvor den findes) i ressourcegruppen `Kontraktbridge`, med CORS for `https://www.kontraktbridge.dk` og `https://kontraktbridge.dk`; deploy som kontakt-API'et (zip og fjernbygning, se `Forside/_kontakt-api/README.md`); kald den med de to testadresser; skriv adressen i README og SYSTEM.md.

## Afklaret

(Udfyldes af Claude Code.)

## Besked til Claude Code

> Model: Opus. Læs `C:\Users\frank\Kontraktbridge\PLAN-postmortem.md`, `SPEC-postmortem-1a-funktion.md` og `_lab\postmortem-0\NOTAT-afproevning.md`. Opret repoet `postmortem` som beskrevet, skriv accepttestene først, og byg trin 1–5 på grenen `funktion`. Stop før merge og før Azure, så jeg kan godkende. Opret ingen Azure-ressourcer.
