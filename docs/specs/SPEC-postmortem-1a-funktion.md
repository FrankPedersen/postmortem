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

Bygget 12. november 2026 af Claude Code (Opus 5.5) på grenen `funktion`; `main` før er tagget `v-foer-funktion` (`540f6ad`, første commit). Godkendt af Frank 12. november 2026 og flettet ind på `main` (trin 6).

1. **Repoet:** `main` har første commit (README, `.gitignore`, `CLAUDE.md` og de tre dokumenter i `docs/specs/`), tagget og grenen `funktion` med trin 2–5 i ét commit. Claude Codes sikkerhedstjek stoppede oprettelsen af det offentlige repo, så Frank oprettede selv `FrankPedersen/postmortem` og pushede. **GitHub Actions er grøn på `funktion`** (`ubuntu-latest`, Python 3.12, 1 min 6 s): 76 tests bestået, og de 2 tjek af rigtige navne springes over uden `_lab`; 32 spil uden cache tog under 3,5 s på Linux.
2. **Testene:** 78 tests er grønne på Windows med Python 3.12 (`api/.venv`), også de seks accepttest. Accepttestene blev skrevet før koden og var røde (22 af 22); grenen havde dengang et commit pr. trin, men dens historik er lagt sammen i ét commit oven på `main` (punkt 12).
3. **Imp i holdturnering regnes mod holdkammeraternes bord**, som specen siger. Bordresultaternes egen imp-kolonne er noget andet: den er regnet mod datum (spil 1: datum 265 = gennemsnittet af de seks scorer). Accepttest 1 holder imp'en op mod scoresheetet for hold 5 mod hold 7 (`scoresheet-450.html`, Franks link): spil for spil og i alt 32–47.
4. **Et valg i holdlisten er et hold ved et bord** (`id` som `2-NS` og `6-OV`): holdets to par sidder ved hver sit bord, og linket siger ikke, hvilket af dem brugeren er. 8 borde giver 16 valg. Holdkammeraternes bord findes som bordet, hvor holdet sidder i den anden retning mod samme hold.
5. **Matchpoint på sidens skala:** turnering 452 har 8 resultater pr. spil, så toppen er 14 (2 pr. slået score), ikke 10 som i specens eksempel med 6 borde. Toppen regnes pr. spil som 2 × antal andre resultater. Accepttest 2: parrets point er sidens på alle 32 spil, i alt 279 af 448 = 62,28 %.
6. **Siderne:**
   - Scorecellerne viser altid tallet set fra NS; kolonnen (NS eller ØV) siger kun, hvem der fik point.
   - Hænderne står med danske bogstaver (E, K, D, B), udspillene med engelske (A, K, Q, J).
   - Personligt regnskab skal have `pairno` (ikke `selectedpair`), og parrets retning står kun i rundens første række.
   - Spilresultaternes DD-tabel er div'er, ikke en `<table>`; begge læses fra teksten.
   - endplays DD-tabel er lig sidens på alle 16 + 32 spil (`ddAfvigelse` er falsk overalt), og sidens par (fx "3NT NS+1", 430) er det samme.
7. **Spil uden resultat:** holdturneringens "(Spillet er fravalgt)" giver `spillet: false` (accepttest 1, bord 4). I parturnering er formatet for et spil uden resultat ikke set på en rigtig side; testen erstatter kontrakten i spil 32 med "M".
8. **Udspil, der ikke passer:** spil 11 i turnering 452 viser ♣K fra Vest, men Syd har ♣K. Udspillet markeres `ukendt`, `ddEfter` er null, og udspillets pris er 0.
9. **Fejl:** alle fejl fra bridge.dk (også 4xx) giver 502 "bridge.dk svarer ikke lige nu". En krop over 4 kB giver 413. Funktionen er anonym, og CORS sættes i platformen som for kontakt-API'et.
10. **Cache:** `postmortem/cache.py` bruger Blob, når `AzureWebJobsStorage` er sat, og ellers en mappe; svigter lagerkontoen, regnes der uden cache. Nøglen er turnering, sektion, spil, et fingeraftryk af hænderne og evt. kontrakt og udspil, uden navne (testet).
11. **Tid:** 32 spil uden cache tager 2,6–4,6 s på Franks pc, når den ikke er belastet, og op til ca. 20 s, når den er (krav: under 30 s; Actions måler det på Linux). Kørt lokalt med Core Tools mod resultater.bridge.dk: turnering 452, par 1, 5,0 s første gang og 1,0 s med cache; turnering 450, bord 2 NS, 1,6 s og −15 imp.
12. **Navne** (Franks krav 12. nov. 2026, før noget pushes):
    - Svaret, loggen og cachen har ingen navne; kun holdlisten har holdnavne.
    - **Testsiderne er anonymiserede:** `api/tests/anonymiser.py` laver de rigtige sider fra `_lab/postmortem-0/bridgedk/` om, så de 37 spillere hedder "Spiller 1"–"Spiller 37" og de 8 hold "Hold 1"–"Hold 8" (alfabetisk, så scriptet giver de samme filer hver gang). Alt andet er byte for byte uændret, også linjeskift og Bridge Solver-links. Kun de anonymiserede sider ligger i `api/tests/data/`.
    - Accepttest 5 tjekker, at svaret ikke har pladsholderne uden for holdlisten. `tests/test_ingen_navne.py` læser navnene fra de rigtige sider og tjekker, at ingen fil i `api/tests/data/` har et af dem, og at testdataene er det, scriptet laver; den springes over, hvor `_lab` ikke findes (fx i Actions).
    - **Historikken er skrevet om:** grenen `funktion` er ét commit oven på `main`, og de gamle commits er fjernet med `git reflog expire` og `git gc --prune=now`, så de rigtige navne aldrig har ligget i git. `git log -p --all` og alle objekter i `.git` er søgt igennem for navnene uden fund. `main` havde ingen navne ("Pedersen" står kun i kontonavnet `FrankPedersen`).
13. **Trin 6, udrullet 12. november 2026** (Franks godkendelse; az-kommandoerne vist og godkendt først):
    - `funktion` er flettet ind på `main` (`2001496`) og pushet.
    - **Oprettet i ressourcegruppen `Kontraktbridge` (West Europe):** lagerkontoen `kontraktbridgepostmortem` (Standard_LRS, TLS 1.2, ingen offentlig blobadgang), Application Insights `kontraktbridge-postmortem` i Log Analytics-arbejdsområdet `kontraktbridge-kontakt-logs` (30 dage), og Function App `kontraktbridge-postmortem` på Flex Consumption med Linux, Python 3.12 og 2048 MB pr. instans.
    - **Højst 10 instanser** (Franks valg): Azure accepterede `--maximum-instance-count 10`, så der var ikke brug for en anden værdi.
    - CORS kun for `https://www.kontraktbridge.dk` og `https://kontraktbridge.dk`, sat i platformen. Zip-udrullet med fjernbygning som kontakt-API'et (`function_app.py`, `host.json`, `requirements.txt` og `postmortem/*.py`).
    - **Adressen er `https://kontraktbridge-postmortem.azurewebsites.net/api/analyse`.**
    - **Kaldt mod resultater.bridge.dk og sammenlignet med `analyser()` lokalt mod de samme sider: alle svar er ens.** Turnering 452, par 1: 62,28 % (to kald); turnering 450: holdlisten med 16 valg og bord 2 NS med −15 imp (to kald); et link uden for bridge.dk giver 400. Svarene har `Access-Control-Allow-Origin: https://www.kontraktbridge.dk`.
    - **Tid i funktionen** (Application Insights): par 452 5,2 s uden cache og 1,8 s med; hold 450 2,2 s og 1,0 s; holdlisten 0,7 s. Et kald fra pc'en med `curl` tager 0,1–0,7 s ud over det.
    - **Cachen oprettede selv containeren `postmortem-dd`** ved første kald og skrev 96 blobs (DD og par samt DD efter udspil for 32 + 16 spil). De 37 rigtige navne og pladsholderne findes ikke i dem.
14. **Ikke gjort:** appen (vindue 1c) og mærkerne (vindue 1b).

## Besked til Claude Code

> Model: Opus. Læs `C:\Users\frank\Kontraktbridge\PLAN-postmortem.md`, `SPEC-postmortem-1a-funktion.md` og `_lab\postmortem-0\NOTAT-afproevning.md`. Opret repoet `postmortem` som beskrevet, skriv accepttestene først, og byg trin 1–5 på grenen `funktion`. Stop før merge og før Azure, så jeg kan godkende. Opret ingen Azure-ressourcer.
