# SPEC – Post Mortem: grænse pr. IP på tværs af instanser

13. november 2026 · Frank (løsning (b) i SPEC-postmortem-1c-app.md, Afklaret, Trin 7). Skrevet af Claude Code ud fra Franks besked samme dag.

## Formål

Grænsen på 10 analyser pr. IP pr. 10 minutter skal holde på Flex Consumption. Live-testen 13. november 2026 viste, at tælleren i hukommelsen ikke holder: kaldene blev fordelt på op til 9 instanser ad gangen, og én instans gav 503 på hvert andet kald. Tælleren flyttes derfor til Table Storage i funktionens lagerkonto. Privatlivsteksterne i appen og på forsiden fortæller om den.

## Afgrænsning

| Sted | Må ske | Må ikke ske |
| --- | --- | --- |
| `postmortem/api/` | tælleren i Table Storage, timer-funktionen, der sletter gamle vinduer, tests, `SVAR.md`, `requirements.txt`, `.github/workflows/api.yml` (Azurite til testene) | ændre beregningen, svaret uden for 429 eller cachen |
| `postmortem`, appen | sætningen om IP-adressen i noten på startskærmen og testen af den | andet |
| Forside | et afsnit om Post Mortem i privatlivspolitikken på Om mig, på dansk og engelsk, og testene af det | ændre det eksisterende afsnit, formularen eller resten af siden |
| Azure | app-indstillingen `IP_HASH_KEY` og tabellen i `kontraktbridgepostmortem` (kommandoerne vises Frank først), udrulning efter godkendelse | andre ressourcer; nøglen må aldrig skrives ud eller i git |

Grene: `ip-graense` i `postmortem` (tag `v-foer-ip-graense`) og `privatliv-postmortem` i Forside (tag `v-foer-privatliv-postmortem`). Stop før merge og før udrulning.

## Tælleren

- **Nøgle:** HMAC-SHA256 af IP'en med nøglen i app-indstillingen `IP_HASH_KEY`. Nøglen genereres og sættes med `az` uden at blive skrevet ud, og den står aldrig i git.
- **Lager:** én række pr. hash og 10-minutters vindue i Table Storage i `kontraktbridgepostmortem`, med optimistisk samtidighed (ETag).
- **Sletning:** en timer-funktion sletter vinduer ældre end 20 minutter.
- **Fejl:** fejler lageret, går analysen igennem, og fejlen logges uden IP.
- Holdlisten tæller ikke. Tælleren i hukommelsen fjernes.

## Privatliv

- **Appens note** får sætningen "Din IP-adresse bruges i krypteret form i højst 20 minutter til at begrænse antallet af analyser."
- **Forsidens privatlivspolitik** får et afsnit om Post Mortem. Det fortæller:
  - hvad der hentes fra bridge.dk, og at navne ikke gemmes;
  - om IP-tælleren: formålet er at forhindre misbrug, grundlaget er legitim interesse, og opbevaringen er højst 20 minutter;
  - at Application Insights logger kald i 30 dage uden IP og link.

## Accepttest (skrives først)

1. To "instanser" (to tællere mod samme lager, Azurite) giver tilsammen 429 ved den 11. analyse. Holdlisten tæller ikke.
2. Slettejobbet fjerner gamle vinduer og lader de nye stå.
3. Et lager, der fejler, giver 200, og fejlen logges uden IP.
4. Appens note har sætningen om IP-adressen. Forsidens privatlivspolitik har afsnittet om Post Mortem på dansk og engelsk.
5. Efter godkendelse og udrulning, live: 11 analyser fra samme IP inden for 10 minutter, og den 11. giver 429.

## Afklaret

Bygget 13. november 2026. **Status: stoppet før merge, før udrulning og før az-kommandoerne til nøglen og tabellen.**

**Tags og grene.** `postmortem`: `main` (`7757af1`) er tagget `v-foer-ip-graense`, og arbejdet ligger på grenen `ip-graense`. Forside: `main` (`8d953b2`) er tagget `v-foer-privatliv-postmortem`, og arbejdet ligger på grenen `privatliv-postmortem`.

**Tælleren (`api/postmortem/graense.py`):**

- **Vinduerne følger uret** og er på 10 minutter (06:00–06:10, 06:10–06:20 …).
  - PartitionKey er vinduets start i UTC (`202611130600`), og RowKey er HMAC-SHA256 af IP'en med `IP_HASH_KEY` (64 hex-tegn). Rækken har kun `antal`. Tabellen hedder `ipgraense`.
  - Den 11. analyse i samme vindue giver 429 med `Retry-After` til vinduets slut.
  - Følgen af faste vinduer: 11 analyser, der spænder over et skifte (fx 5 før og 6 efter kl. 06:10), giver ikke 429. Inden for 10 minutter kan der i værste fald gå 20 igennem. Live-testen lægges midt i et vindue.
- **Samtidighed:** rækken læses med sin ETag og skrives med `IfNotModified`. Ved en konflikt læses den igen, højst 8 gange. Findes rækken ikke, oprettes den, og når en anden instans nåede først, læses den igen. Testen med 20 samtidige kald fra to instanser giver præcis 10 igennem.
- **Sletning:** timer-funktionen `slet_ip_vinduer` (`0 */5 * * * *`) sletter vinduer, der er mindst 15 minutter gamle (`SLET_EFTER`). Specen siger "ældre end 20 minutter". Med 15 minutter og en kørsel hvert 5. minut står en hash højst 20 minutter fra vinduets start, så privatlivsteksterne ("højst 20 minutter") holder, og intet vindue bliver ældre end 20 minutter.
- **Fejl:**
  - Enhver fejl fra lageret giver 200 og loggen "postmortem: graense-lageret fejlede (fejltype)" uden IP og hash.
  - Mangler `IP_HASH_KEY` eller `AzureWebJobsStorage`, logges "postmortem: graensen er slået fra (IP_HASH_KEY eller lageret mangler)", og analysen går igennem.
  - Klienten har 2 genforsøg og tidsgrænser på 3 og 5 s, så en analyse ikke venter længe på tælleren.
- **Ingen IP eller hash i loggen:** Azure SDK'en logger hver adresse på INFO og urllib3 på DEBUG. For Table Storage står hashen i adressen (`…(PartitionKey='…',RowKey='<hash>')`), og ellers ville den ligge 30 dage i Application Insights. Loggerne `azure` og `urllib3` logger derfor kun advarsler og fejl.
  - Testen fangede først urllib3's DEBUG-linje.
  - Det fjerner også SDK'ens linjer om blob-cachen fra Application Insights (13. november var der over tusind af dem på 3 timer).
- **Holdlisten tæller ikke**, og kald uden IP har ingen grænse, som før. Tælleren i hukommelsen (`Graense` i `function_app.py`) er fjernet.
- **Nøglen** læses kun fra miljøet. En test tjekker, at ingen fil i repoet har en værdi for `IP_HASH_KEY`. `local.settings.example.json` har den tom (grænsen er slået fra lokalt) og bruger `UseDevelopmentStorage=true`, fordi timer-funktionen kræver et lager. README viser, hvordan Azurite startes.

**Tests (skrevet først og røde):**

- **Funktionen:** `api/tests/test_graense.py` har 14 tests. De erstatter de 8 tests af tælleren i hukommelsen.
  - Testene starter selv Azurite 3.37.0 med `npx` (fixturen `azurite` i `conftest.py`) og bruger en tom tabel pr. test.
  - Dækket er:
    - to instanser, der giver 429 ved den 11.;
    - samtidige kald;
    - nyt vindue;
    - at rækken har en hash og ikke IP'en;
    - slettejobbet og dets timer;
    - funktionen med holdlisten, 429 og `Retry-After`, port og proxy og IPv6;
    - at hverken IP eller hash står i loggen;
    - et lager, der fejler (både en falsk og en rigtig klient mod en død port);
    - manglende nøgle;
    - at tælleren i hukommelsen er væk, og at nøglen ikke står i repoet.
  - `.github/workflows/api.yml` har fået Node 22 til Azurite.
  - `pytest`: 103 tests er grønne.
- **Appen:** `start.test.tsx` tjekker sætningen i noten. `npm test`: 56 tests er grønne, og `tools/tjek_bredde.mjs` er grøn.
  - Vitest skal køres fra en sti med stort drevbogstav (`C:\…`). Med `c:\…` indlæser vitest sig selv to gange og melder "failed to find the runner".
- **Forsiden:** `tools/tjek_privatliv.py` har klassen `PostMortem` med 5 tests: afsnittet efter det første, dansk og engelsk tekst, det specen kræver, og at det første afsnit er uændret.
  - `tools/tjek_engelsk_om_mig.mjs` har fået overskriften "Post Mortem." på listen over navne, der er ens på begge sprog.
  - Alle forsidens tjek er grønne, i alt 16: `tjek_privatliv` (begge), `tjek_om_mig`, `tjek_engelsk_om_mig`, `tjek_kontakt` (begge), `tjek_ny_forside`, `tjek_kun_siden`, `tjek_bredde`, `tjek_skrifttyper` (begge), `tjek_scoring`, `tjek_fagord`, `tjek_bydeform`, `tjek_ordbog` og `tjek_mappe`.
  - Skærmbilleder af kontaktboksen lukket og åben (320, 390 og 1280 px, dansk og engelsk) ligger i `Kontraktbridge\skaermbilleder\privatliv-postmortem\`.

**Privatliv:**

- **Appens note** har Franks sætning ordret.
- **Forsiden:** afsnittet `<p class="om-privat om-privat-pm">` står under det eksisterende afsnit i samme `<details>`, på dansk med engelsk i `data-en`. Teksten er Claude Codes og skal læses af Frank:
  - Dansk: "**Post Mortem.** Når du indsætter et link, henter en funktion i Microsoft Azure turneringens sider fra resultater.bridge.dk og regner spillene igennem. Navnene fra siderne gemmes ikke: kun beregningerne af spillene gemmes, uden navne, og svaret ligger kun i din browser, til du lukker fanen. Din IP-adresse bruges i krypteret form i højst 20 minutter til at begrænse antallet af analyser. Formålet er at forhindre misbrug, og grundlaget er legitim interesse. Azure logger tidspunktet for hvert kald og et omtrentligt land og en by i 30 dage, men ikke din IP-adresse eller linket."
  - Engelsk: "**Post Mortem.** When you paste a link, a function in Microsoft Azure fetches the tournament's pages from resultater.bridge.dk and works through the boards. The names on the pages are not stored: only the calculations of the boards are stored, without names, and the result stays in your browser until you close the tab. Your IP address is used in encrypted form for up to 20 minutes to limit the number of analyses. The purpose is to prevent misuse, and the legal basis is legitimate interest. Azure logs the time of each request and an approximate country and city for 30 days, but not your IP address or the link."
- **"Et omtrentligt land og en by"** er tilføjet ud over specen. Application Insights gemmer by og land for hvert kald til Post Mortem, som for kontakt-API'et, så teksten skal sige det for at være rigtig. Det er tjekket 13. november: IP'en er `0.0.0.0`, adressen er kun funktionens egen, og intet bridge.dk-link står i loggen.
- **"Krypteret form"** er Franks ord. Teknisk er det en nøglet hash (HMAC-SHA256), som ikke kan regnes tilbage uden nøglen.

**Dokumentation:**

- `api/SVAR.md` (429-linjen siger vindue og på tværs af instanser), README, repoets `CLAUDE.md` (nøglen, logningen og Azurite) og den fælles `../CLAUDE.md` (`IP_HASH_KEY` under Hemmeligheder).
- `SYSTEM.md` opdateres ved udrulningen.

**Kommandoerne, der vises Frank før kørsel** (efter godkendelse; nøglen laves i en underskal og skrives aldrig ud, og `-o none` holder `az` fra at vise indstillingerne):

```bash
# 1. Nøglen
MSYS_NO_PATHCONV=1 az functionapp config appsettings set -g Kontraktbridge -n kontraktbridge-postmortem \
  --settings "IP_HASH_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')" -o none
MSYS_NO_PATHCONV=1 az functionapp config appsettings list -g Kontraktbridge -n kontraktbridge-postmortem --query "[].name" -o tsv
# 2. Tabellen
MSYS_NO_PATHCONV=1 az storage table create --name ipgraense --account-name kontraktbridgepostmortem --auth-mode key -o none
MSYS_NO_PATHCONV=1 az storage table exists --name ipgraense --account-name kontraktbridgepostmortem --auth-mode key
```

Derefter skal begge grene flettes, funktionen udrulles som i 1a (zip med `postmortem/graense.py` og `azure-data-tables`) og live-testen gentages midt i et vindue.
