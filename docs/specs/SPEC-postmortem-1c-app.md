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

(Udfyldes af Claude Code.)

## Besked til Claude Code

> Model: Opus. Læs `Postmortem/docs/specs/SPEC-postmortem-1c-app.md`, `PLAN-postmortem.md` og `api/SVAR.md`, og se mockuppen. Tag og opret grenene i `postmortem` og Forside som beskrevet, skriv accepttestene først, og byg trin 1–6. Stop før merge, før udrulning og før budgetalarmen, så jeg kan godkende.
