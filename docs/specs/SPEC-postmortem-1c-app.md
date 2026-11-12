# SPEC – Post Mortem, vindue 1c: appen

12. november 2026 · Frank. **Model: Opus.** Plan: `PLAN-postmortem.md`. Funktionen: `SPEC-postmortem-1a-funktion.md` og `api/SVAR.md`. Mockup: designlærredet "Post Mortem – mockup" (https://claude.ai/artifact/QLhXKemCyDTqTe3aT7u4LP).

## Formål

Appen Post Mortem på `www.kontraktbridge.dk/postmortem/`: brugeren indsætter et link fra resultater.bridge.dk og ser aftenens oversigt og en analyse af hvert spil, bygget på svaret fra funktionen. Mærkerne (skvis, slutspil, nøglebeslutninger) og rådene til spilføring og modspil kommer i vindue 1b; 1c viser alt det andet. Desuden: PM-kortet på forsiden, en grænse pr. IP i funktionen og en budgetalarm.

## Afgrænsning

| Sted | Må ske | Må ikke ske |
| --- | --- | --- |
| Repoet `postmortem`, roden | appen (Vite, React, TypeScript, vitest), `index.html`, `src/`, `public/`, `.github/workflows/pages.yml` | ændre `docs/specs/` ud over denne spec og Afklaret |
| `postmortem/api/` | grænse pr. IP (se nedenfor), test til den, `SVAR.md` for 429 | ændre beregningen, svaret eller cachen |
| Repoet `frankpedersen.github.io` (Forside) | PM-kortet, ledeteksten over kortene, sidefodens liste, `sitemap.xml`, de tests der tæller kort | ændre andre kort, stilen eller menuen |
| Azure | budgetalarm på ressourcegruppen `Kontraktbridge` (kommandoerne vises Frank først), udrulning af funktionen med grænsen | nye ressourcer i øvrigt |
| Fordelingstræneren, Konventionstræner | intet (fonte og tokens kopieres derfra, men filerne røres ikke) | alt |

Før arbejdet: tag `main` i `postmortem` som `v-foer-app` og i Forside som `v-foer-postmortem-kort`; arbejd på grenen `app` i `postmortem` og `postmortem-kort` i Forside. Stop før merge i begge. Kræver noget alligevel en ændring ud over tabellen, så stop og spørg.

## Opsætning

- Samme stak og testopsætning som Fordelingstræneren: Vite, React, TypeScript, vitest og Testing Library. Bygges med `--base=/postmortem/` i en `pages.yml` som Fordelingstrænerens; den eksisterende `api.yml` bliver stående.
- **Design:** tokens fra designsystemet Fordelingstræneren (`design/tokens.json` og `src/ui/styles.css` i det repo) kopieres til `src/styles.css` med de samme CSS-variabler, lys og mørk tilstand. Fontene Inter, Manrope og Noto Sans Symbols 2 kopieres fra Fordelingstrænerens `public/fonts/` med licensfilerne. Topbjælken og sidefoden som i Fordelingstræneren (7NT-logoet, sort bjælke, link tilbage til forsiden).
- **Bridgebordet** bygges efter designsystemets komponent Bridgebord (kompas i `table`, pladsnavne som eyebrow, hænder i Inter 600 med tabulære cifre), med alle fire hænder synlige og kontrakt og udspil i kompassets midte, som i mockuppen.
- **Kun dansk** i første udgave; teksterne samles i `src/tekster.ts`, så engelsk kan komme senere.
- **Ingen PWA og ingen lagring** af aftener. Svaret må ligge i `sessionStorage`, så en genindlæsning ikke kræver nyt kald; det forsvinder, når fanen lukkes.
- **Adressen til funktionen** står ét sted (`src/api.ts`): `https://kontraktbridge-postmortem.azurewebsites.net/api/analyse`. Under udvikling går kald gennem Vites proxy, så CORS ikke skal ændres.

## Skærmene (som mockuppen)

1. **Start og guide** (`#/`): linkfelt med `<label>`, knappen Analysér, guiden i tre trin med eksemplet på adresselinjen, noten om, hvad der gemmes. Linket tjekkes i appen, før det sendes (skal begynde med `https://resultater.bridge.dk/`), og funktionens fejltekster vises som de er. Mens funktionen regner: "Regner aftenens spil …" og knappen deaktiveret. 429 vises som "For mange analyser lige nu. Prøv igen om lidt."
2. **Valg af hold** (kun holdturnering): først holdet (holdnavnene fra `vaelg`), derefter "Sad I Nord–Syd eller Øst–Vest?". Det svarer til et id i `vaelg.hold`.
3. **Aftenens oversigt** (`#/aften`): turnering, dato, form og resultat (procent eller imp, "imp mod jeres andet bord" i holdturnering); de fire faktorer som bjælker omkring middel med tal; boksen "Største forbedring"; listen over spil med kontrakt, udspil, stik, score og procent/imp, og mærker for den største faktor i spillet ("Spilføring −1 stik", "Udspil −1 stik", "Meldinger: 4♠ var bedre", "Bedste kontrakt"); filter Alle og Tabte point. Kortet "Teknikker i aftenens spil" og filtrene Slutspil og Skvis bygges ikke før 1b.
4. **Analysevindue** (`#/spil/<nr>`): forrige og næste spil; bridgebordet; "Ved jeres bord" med kontrakt, udspil, stik, score, point og feltets scorer (jeres række fremhævet); DD-tabellen med par og max før og efter udspil; de fire faktorer for spillet med en linje tekst hver. Afsnittene "Råd til spilføringen" og "Råd til modspillet" bygges ikke før 1b. Spil med `spillet: false` viser bordet og DD-tabellen og "Ikke spillet ved jeres bord".

Tal skrives på dansk (komma som decimaltegn, "−" som minus), og alle knapper og links er rigtige `<button>` og `<a>` med mindst 44 px trykflade. Appen skal virke fra 320 px bredde uden vandret rulning; fra 1000 px må analysevinduet stå i to spalter (bordet til venstre), som Farvebehandling – Analyse.

## Grænse pr. IP i funktionen

Højst 10 analyser pr. IP pr. 10 minutter (holdlisten tæller ikke), i hukommelsen pr. instans som i kontakt-API'et. Derover 429 med "For mange analyser lige nu. Prøv igen om lidt." IP'en gemmes kun i hukommelsen og logges ikke. Test i `api/tests/`, og en linje i `SVAR.md`. Udrulles som i trin 6 i 1a.

## Budgetalarm

En månedlig budgetalarm på ressourcegruppen `Kontraktbridge`, 50 kr., med mail til Frank ved 80 % og 100 %. Kommandoerne vises Frank, før de køres. Hvis budgetter ikke kan oprettes på abonnementet med `az`, så beskriv i Afklaret, hvordan Frank gør det i portalen.

## Forsiden

- Det sjette kort i "Alle trænere" (det tomme felt): kicker "Analyse", overskrift "Post Mortem", tekst "Indsæt linket til jeres klubaften fra bridge.dk, og se, hvor pointene gik tabt.", badge "Ny", link `/postmortem/`. Samme opbygning og stil som de andre kort, med `data-en`-tekster ("Analysis", "Post Mortem", "Paste the link to your club evening from bridge.dk and see where the points went.", "New").
- Ledeteksten over kortene: "Fem trænere og en analyse af jeres klubaften. Hele kortet er et link." (engelsk: "Five trainers and an analysis of your club evening. The whole card is a link.").
- Post Mortem i sidefodens liste og i `sitemap.xml`.
- Forsidens tjek (`tjek_ny_forside.mjs`, `tjek_kun_siden.mjs`, `tjek_fagord.py`, `tjek_bydeform.py`) skal være grønne; de tests, der tæller kort, rettes og nævnes i Afklaret.

## Accepttest (skrives først)

- **Data til testene:** to svar fra funktionen gemmes som `src/test/data/par-452.json` og `src/test/data/hold-450.json`, kørt mod de anonymiserede testsider, så der ingen rigtige navne er i dem.
1. Start: et link fra et andet domæne afvises i appen; 400-, 422-, 429- og 502-tekster vises; knappen er deaktiveret, mens der regnes.
2. Holdturnering: holdlisten og retningsvalget giver det rigtige id, og analysen vises bagefter.
3. Aften: de fire faktorsummer og resultatet står som i svaret; summen af faktorerne = resultatet mod middel; filteret Tabte point viser kun spil med negativ sum.
4. Analysevindue: de fire hænder, DD-tabellen og feltets scorer står som i svaret for spil 7 i 452; forrige og næste virker; `spillet: false` vises rigtigt.
5. Tal skrives med komma og "−"; ingen engelske ord i teksterne.
6. Bredde: ingen vandret rulning ved 320 px på de tre skærme (samme teknik som Forsidens `tjek_bredde.mjs`).
7. Tilgængelighed: linkfeltet har en label, bordet er en `figure` med `aria-label`, ingen klikbare `div`er.
8. Funktionen: 11. analyse fra samme IP inden for 10 minutter giver 429; holdlisten tæller ikke.

## Trin

1. Tags og grene i begge repoer.
2. Accepttestene (røde).
3. Appens opsætning, design og de fire skærme.
4. Grænsen pr. IP i funktionen og dens test.
5. Forsidens kort, ledetekst, sidefod og sitemap.
6. Alle tests og tjek grønne; README i `postmortem` med lokal kørsel. **Stop før merge, før udrulning og før budgetalarmen.**
7. **Efter Franks godkendelse:** merge begge grene; udrul funktionen; slå GitHub Pages til for `postmortem` (Actions som kilde); vis kommandoerne til budgetalarmen og kør dem efter Franks ja; tjek live, at `www.kontraktbridge.dk/postmortem/` analyserer et personligt regnskab og en holdturnering fra bridge.dk, og at forsidens kort fører dertil; skriv det i Afklaret og SYSTEM.md.

## Afklaret

Trin 1–6 er bygget 12. november 2026. **Status: stoppet før merge, før udrulning af funktionen og før budgetalarmen.**

**Tags og grene.** `postmortem`: `main` (`3365756`) er tagget `v-foer-app`, og arbejdet ligger på grenen `app`. Forside: `main` (`eece597`) er tagget `v-foer-postmortem-kort`, og arbejdet ligger på grenen `postmortem-kort`. Intet er pushet.

**Testdata.** Funktionens `analyser` er kørt mod de anonymiserede sider i `api/tests/data/` og gemt i `src/test/data/`: `par-452.json` (par 1, 62,28 %), `hold-450.json` (bord 2 NS, −15 imp) og desuden `hold-450-vaelg.json`, holdlisten til testen af holdvalget. Kommandoen står i README. `api/tests/test_ingen_navne.py` tjekker nu også de tre filer mod de rigtige navne i `_lab`, og testen er grøn. Ingen af de to svar har et spil med `spillet: false`. Testene laver derfor et af spil 7 i samme form, som funktionen bruger (`_ikke_spillet`).

**Tests.** Accepttestene blev skrevet først og var røde:

- Appen: `src/test/start`, `hold`, `aften`, `spil`, `sprog` og `tilgaengelighed.test.tsx`, i alt 51 tests.
- Funktionen: `api/tests/test_graense.py`, 8 tests.
- Bredden: `tools/tjek_bredde.mjs` (accepttest 6) kører i Chrome over Vites udviklingsserver. Den lægger svarene i `sessionStorage` og måler start, holdvalg og retning, aftenen (også med Tabte point) og alle 48 spil. Den måler ved 320, 390 og 1280 px:
  - ingen vandret rulning;
  - alle synlige knapper og links er mindst 44 × 44 px;
  - ingen hånd eller noget pladsnavn ligger oven i kompasset;
  - ved 1280 px står bordet til venstre.

Nu er `npm test` grøn (`tsc` og 51 tests), `pytest` er grøn (86 tests) og `tjek_bredde.mjs` er grøn.

**Rettet fra mockuppen og specen, fordi husets regel om beskrivende form gælder** (`tjek_bydeform.py` fejler på "Indsæt"). Frank bør læse teksterne:

- **Forsidens kort:**
  - Teksten er "Med linket til jeres klubaften fra bridge.dk viser analysen, hvor pointene gik tabt." På engelsk: "With the link to your club evening from bridge.dk, the analysis shows where the points went."
  - Mobilteksten er "Klubaftenen fra bridge.dk, spil for spil." (engelsk: "Your club evening from bridge.dk, board by board.").
  - Linket hedder "Åbn analysen →", som allerede står på listen over undtagelser.
  - Billedet er "−1" med pillen "stik".
- **Appens intro:** "Med et link fra resultater.bridge.dk bliver klubaftenens spil gennemgået: hvad der kunne vindes med åbne kort, og hvor pointene gik tabt." Slutspil og skvis er udeladt, til 1b viser dem.
- **Guidens tre trin:**
  - "Linket findes på **resultater.bridge.dk** under klubben og turneringen."
  - "Siden er **Bordresultater** for jeres hold eller **Personligt regnskab** for jeres par."
  - "Hele adressen fra adresselinjen (linjen med `filename=…`) kopieres og sættes ind ovenfor."
- **Spillene:** "tryk for analysen" over listen er erstattet af "Hele rækken er et link."

Appen har sin egen fagords- og bydeformtest i `npm test` (`src/sprog/` med Fordelingstrænerens lister). Testen læser al tekst på alle skærme med begge svar og hele `src/tekster.ts`. Undtagelser er knappen "Analysér" og "Prøv igen om lidt."

**Valg i appen:**

- **Mærket i listen** kommer fra spillets mest negative del af faktorerne: spilføring, udspil (parrets udspil, `udspilseffekt`), resten af modspillet og meldinger, i den rækkefølge ved lighed.
  - Er ingen negativ, vises den største positive spilføring eller modspil ("Spilføring +1 stik").
  - Ellers vises "Bedste kontrakt" (parret var spilfører) eller "Bedste modspil".
  - Held giver ikke et mærke.
  - Stiktallet er forskellen mellem stik og DD efter udspillet (før udspillet, når udspillet er ukendt).
  - "Meldinger: X var bedre" nævner par-kontrakten med siden, når den er modpartens (fx "Ø–V 4♥").
- **Procenten i listen** er orange-brun under 40 % og grøn over 60 %. Imp er farvet efter fortegnet.
- **DD-tabellen** har fire rækker (N, S, Ø, V) i stedet for mockuppens to, fordi de to hænder i en side kan tage forskelligt (fx spil 1 i 450: Ø 4 og V 5 i klør). Kontraktens felt er fremhævet.
- **Feltet** viser score og antal, ikke kontrakten, fordi svaret kun har scorerne (`felt`). Jeres række tæller jer med ("+120 (jer) ×2").
- **Held og uheld:** linjen om feltet følger par-delen af held. Modpartens udspil står for sig ("Modpartens udspil gav jer et stik.").
- **Doblet og redoblet** skrives "D" og "RD" som i mockuppen ("4♠ D"). Kort skrives med E K D B 10.
- **Topbjælken:** pilen tilbage står før 7NT-logoet som i mockuppen. "Spil 7 af 24" fra mockuppens topbjælke står under overskriften ("7 af 32 · Giver Syd · Alle i zonen"), fordi der ikke er plads ved siden af logoet. Under 380 px er navnet "Kontraktbridge" skjult ved siden af pilen, men skærmlæseren læser det stadig.
- **44 px:** alle knapper og links har mindst 44 px. Det gælder også sidefodens links, så sidefoden er højere end Fordelingstrænerens og forsidens (26 px rækker), og filterpillerne, som er 44 px i stedet for mockuppens 36. Ønsker Frank sidefoden som i Fordelingstræneren, er det én regel i `src/styles.css`.
- **Bordet:** kompasset er 84 px under 380 px, 112 px op til 480 px og 132 px derover (som Fordelingstrænerens). Hænderne er 1, 1,15 og 1,25 rem. Pladsnavnene ombrydes, og Nord og Syd står midt over kompasset.
- **Fra 1000 px** står analysevinduet i to spalter med bordet til venstre, og bordet bliver stående, når man ruller.
- **Fejl i nettet:** når funktionen ikke svarer, vises "Analysen kunne ikke hentes lige nu. Prøv igen om lidt.". Et tomt felt giver "Linket mangler."
- **Lagring:** svaret ligger i `sessionStorage` under nøglen `postmortem` (link, holdliste og analyse). En adresse, der mangler sit svar, går tilbage til start, og et ukendt spilnummer går til aftenen.

**Grænsen pr. IP** står i `api/function_app.py`, med 8 tests i `test_graense.py` og en linje i `SVAR.md`:

- Vinduet starter ved den første analyse, som i kontakt-API'et.
- Alle kald tæller undtagen holdlisten. Holdlisten er et link til `multihold_bordresultater.php` uden `hold`. Også et kald, der ender med en fejl, tæller, fordi det også henter fra bridge.dk.
- IP'en tages fra `X-Forwarded-For` (første adresse, uden port) eller `X-Client-IP`. Uden IP er der ingen grænse, som i kontakt-API'et og funktionens øvrige tests.
- Hukommelsen har højst 5000 adresser. Svaret har `Retry-After`, og loggen skriver "postmortem: 429 graense" uden IP.
- Beregningen, svaret og cachen er ikke ændret.

**Forsiden (grenen `postmortem-kort`):**

- Det sjette kort, den nye ledetekst, Post Mortem i sidefoden på alle fire sider og `/postmortem/` i `sitemap.xml`.
- Sidefoden bygges også af `tools/build_ordbog.py` og `tools/build_scoring.py`. Linjen er tilføjet dér, og siderne er bygget igen; de giver samme fil.
- Mobilmenuen er ikke ændret (specen). Post Mortem står derfor ikke i menuen.
- Rettede tests:
  - `tjek_ny_forside.mjs`: seks kort med Post Mortem sidst og `/postmortem/`, kortets kicker, tekst og mærket "Ny", ledeteksten, seks billeder ved 390 px, sidefoden med Post Mortem på alle fire sider og sitemap.
  - `tjek_kun_siden.mjs`: `/postmortem/` er et andet repo, som `ANDRE_REPOER` springer over.
  - `tjek_engelsk_om_mig.mjs`: "Post Mortem" er det samme på begge sprog og står nu på listen over navne.
- Disse tjek er grønne: `tjek_ny_forside`, `tjek_kun_siden`, `tjek_fagord`, `tjek_bydeform`, `tjek_bredde`, `tjek_ordbog`, `tjek_skrifttyper` (begge), `tjek_scoring`, `tjek_om_mig`, `tjek_privatliv` (begge), `tjek_engelsk_om_mig` og `tjek_kontakt` (begge).
- `tjek_mappe.py` fejler også på `main`. Den venter fire mapper i `Kontraktbridge.code-workspace`, og Postmortem kom med som femte i vindue 1a. Fejlen er uden for denne spec og er ikke rettet.

**Udgivelse (trin 7, ikke gjort):**

- `.github/workflows/pages.yml` er som Fordelingstrænerens: `npm ci`, `npm test` og `npx vite build --base=/postmortem/`. Bygget er prøvet lokalt, og stierne er `/postmortem/…`.
- Produktionsbygget kalder Azure-adressen, og udviklingsserveren bruger proxyen. Funktionens CORS er ikke ændret.
- Pages skal slås til med GitHub Actions som kilde.

**Budgetalarmen (trin 7, ikke kørt):**

- `az consumption budget create-with-rg` findes (preview) og tager notifikationer.
- Abonnementet har i forvejen budgettet "LoginProjekt" (300 pr. måned, på abonnementet). Valutaen kunne ikke læses med `az`. Beløbet er i abonnementets faktureringsvaluta, så det skal ses i portalen, at det er kr.
- Kommandoen, der vises Frank før kørsel (mailadressen indsættes ved kørslen og skrives ikke her):

```bash
MSYS_NO_PATHCONV=1 az consumption budget create-with-rg -g Kontraktbridge -n kontraktbridge-maaned \
  --amount 50 --category Cost --time-grain Monthly --time-period "{start-date:2026-11-01T00:00:00Z}" \
  --notifications "{Faktisk80:{enabled:true,operator:GreaterThanOrEqualTo,threshold:80,contact-emails:[<mail>]},Faktisk100:{enabled:true,operator:GreaterThanOrEqualTo,threshold:100,contact-emails:[<mail>]}}"
az consumption budget show-with-rg -g Kontraktbridge -n kontraktbridge-maaned
```

- Afviser `az` kommandoen, gøres det i portalen: Ressourcegruppen Kontraktbridge → Cost Management → Budgets → Add. Budgettet er månedligt med 50 og alarmer ved 80 % og 100 % (Actual) til Franks mail.

**Skærmbilleder** fra `tools/tjek_bredde.mjs --billeder` ligger i `Kontraktbridge\skaermbilleder\app\` (390 og 1280 px: start, hold, aften par og hold, spil 7 og hold spil 4).

## Besked til Claude Code

> Model: Opus. Læs `Postmortem/docs/specs/SPEC-postmortem-1c-app.md`, `PLAN-postmortem.md` og `api/SVAR.md`, og se mockuppen. Tag og opret grenene i `postmortem` og Forside som beskrevet, skriv accepttestene først, og byg trin 1–6. Stop før merge, før udrulning og før budgetalarmen, så jeg kan godkende.
