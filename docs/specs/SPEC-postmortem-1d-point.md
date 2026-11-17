# SPEC – Post Mortem 1d: point som bridge.dk, scoren pr. spil og forklaring af pointene

17. november 2026 · repo `Postmortem` · gren `point-som-bridgedk`, tag før: `v-foer-point-som-bridgedk`. Det er en rettelse til v1 og kommer før v2a.

## Formål

Frank har fundet tre ting på aftenen 16. november 2026 (Efterårs Hold og Par, Par Gul, par 1, 32 spil):

1. **Pointene stemmer ikke med bridge.dk.**

   | | Point | Procent |
   | --- | --- | --- |
   | Post Mortem | 223 af 436 | 51,15 % |
   | bridge.dk | 225,9 | 50,4 % |

   Forskellen kommer af regnemåden. Post Mortem regner parpoint med en top, der afhænger af, hvor mange gange spillet er spillet (436 = summen af 2 × antal andre resultater). bridge.dk skalerer alle spil til samme top (225,9 / 50,4 % svarer til 448 = 32 × 14) med Neubergs formel, når et spil er spillet færre gange end de andre. Post Mortem skal vise det samme tal som bridge.dk, ellers kan resultatet ikke bruges til at følge udviklingen.
2. **Oversigten skal vise scoren for hvert spil.**
3. **"Hvor gik pointene?" skal have en ⓘ,** der forklarer, hvad pointene betyder.

## Afgrænsning

| Må ændres | Må ikke ændres |
| --- | --- |
| `api/postmortem/analyse.py` og `regn.py`: parpoint, top og procent ved parturnering; skalering af faktorerne | dobbeltdummy, mærkerne, rådene, cachen og IP-grænsen |
| `api/postmortem/laes.py`, hvis bridge.dk's point pr. spil skal læses fra det personlige regnskab | hentningen fra bridge.dk i øvrigt |
| appens oversigt (`src/skaerme/`) og `src/tekster.ts`: scoren pr. spil og ⓘ-teksten | holdturnering (imp) |
| tests og testdata (anonymiserede som i v1) | ingen rigtige navne i repoet |

## 1. Point og procent som bridge.dk

- **Parpoint pr. spil skaleres som bridge.dk.** Er et spil spillet færre gange end det mest spillede spil i sektionen, skaleres pointene med Neubergs formel til samme top: P' = (P + 1) · N / n − 1, hvor P er pointene med den lille top, n er antal resultater på spillet (jeres medregnet), og N er det største antal i sektionen.
- **bridge.dk's egne tal er facit.** Hvor det personlige regnskab viser parpoint pr. spil, skal Post Mortems tal stemme med dem. Tallene viser altså point pr. spil, i alt og i procent. Justerede eller kunstige scorer (fx et spil markeret "M") får de point, bridge.dk giver dem. Er der en forskel, der ikke kan forklares, så stop og rapportér.
- **Faktorerne skaleres med samme faktor N / n pr. spil,** så teleskopsummen stadig går op: meldinger + spilføring + modspil + held og uheld = jeres point − middel. Middel er halvdelen af toppen.
- **Procenten** vises med én decimal som bridge.dk (50,4 %).

## 2. Scoren for hvert spil på oversigten

Hvert spil på aftenens oversigt viser jeres **score** (fx +620 eller −100), **parpoint** og **procent** for spillet. Det sker ud over det, linjen viser i dag. På mobil må linjen brydes, men den må ikke give vandret scroll ved 320 px.

## 3. ⓘ ved "Hvor gik pointene?"

Der kommer en ⓘ som i de andre apps (et klik eller tryk åbner teksten, og den kan lukkes med tastatur). Forslag til ordlyd, som er **Franks tekst at rette**:

> **Point** er parpoint. På hvert spil får I 2 point for hvert par i feltet, I slår, og 1 for hvert, I deler med. Er et spil spillet færre gange, omregnes pointene som hos bridge.dk. **Middel** er halvdelen af det mulige, altså 50 %. Tallene viser, hvor mange point I lå over eller under middel, og hvad der flyttede dem:
> - **Meldinger (begge sider):** forskellen mellem den spillede kontrakt og det bedste, der kunne meldes med åbne kort.
> - **Spilføring** og **Modspil:** stik, I tabte i forhold til åbne kort. De er nul eller negative.
> - **Held og uheld:** resten, altså det, feltet gjorde anderledes, uden at I gjorde noget forkert. Modpartens fejl tæller med her.
>
> Summen er jeres point mod middel.

## Accepttest (skrives først, røde)

1. **Aftenen 16. nov. (par 1, sektion Gul):** samlede point 225,9 og 50,4 % som bridge.dk. Testdata gemmes anonymiseret med `api/tests/anonymiser.py`. Hvis siden ikke længere kan hentes, bruges den gemte kopi.
2. **Point pr. spil** stemmer med bridge.dk for alle 32 spil (afrundet som bridge.dk).
3. **Neubergs formel:** faste eksempler med et spil spillet 6, 7 og 8 gange i en sektion med N = 8.
4. **Teleskopsummen** går op pr. spil og i alt efter skaleringen. "I alt mod middel" for 16. nov. er 225,9 − 224 = +1,9.
5. **Oversigten** viser score, point og procent pr. spil. Der er ingen vandret scroll ved 320 og 390 px.
6. **ⓘ'en** åbner og lukker med mus, tryk og tastatur og har den tekst, Frank godkender.
7. **Uændret:** Holdturnering, dobbeltdummy, mærker og råd giver samme resultat som før. Alle eksisterende tests består.

## Afklaret

**Status (17. november 2026): bygget og stoppet før fletning.** Accepttest 1–7 og alle andre tests er grønne på grenen `point-som-bridgedk`. **Venter på Franks godkendelse; ikke flettet.** Intet er pushet, og funktionen er ikke udrullet.

- **Linket (Franks svar 17. nov. 2026):** `https://resultater.bridge.dk/template/personligt_regnskab.php?filename=1111/MT3287GT11912.XML&tournament=3287&section=7&pairno=1`.
- **Det, siden viser:** datoen 16-11-2026, turneringen "Efterårs Hold og Par, Par Gul" (parturnering, sektion 7) og par 1, der sad Nord–Syd hele aftenen: 32 spil i 8 runder med 4 spil og top 14. Rundernes point er 35,0, 17,0, 34,0, 26,0, 27,0, 34,0, 23,0 og 29,9, i alt 225,9. Point og procent i alt står ikke i regnskabet; de er læst i stillingen for samme sektion (`resultater.php?…&section=7`, "Resultater efter 7. sektion", middel 224): par 1 har 50,4 % og 225,9 point. Siden er altså aftenen, Frank nævnte. Stillingen er kun brugt til kontrollen og ikke gemt.
- **Commits:** `c9e9bbe` accepttestene og testdataene, røde før bygningen; `ba9d082` bygningen; Afklaret og tokenforbruget i de sidste commits på grenen.
- **Testdata:** de tre sider, Post Mortem selv henter (det personlige regnskab, `kortfordeling.php` og `spilresultater.php` for sektion 7), er hentet til en midlertidig mappe uden for repoet og anonymiseret med `anonymiser.py` som et nyt sæt, `1d` (32 spillere, ingen hold), ved siden af `v1`, så siderne fra v1 er uændrede byte for byte. Et ekstra tjek med navnene fra stillingen fandt hverken de 32 navne eller deres ord på de anonymiserede sider. `test_ingen_navne.py` med `POSTMORTEM_RIGTIGE_SIDER` sat til mappen: 2 bestået (3,9 s). Mappen er slettet bagefter, og det er tjekket, at den er væk. `src/test/data/par-3287.json` er funktionens svar på de anonymiserede sider.
- **Rød før bygningen (`c9e9bbe`):** pytest 24 fejlet, 259 bestået og 3 sprunget over (132 s): `regn.neuberg` og `regn.parpoint` fandtes ikke, regnskabets point blev ikke læst, "P" blev ikke læst som pas, toppen var 436 og ikke 448, og procenten havde to decimaler. Vitest 10 fejlet og 94 bestået: 51,15 % (223 af 436), "I alt mod middel +5", spil 32 med 5 af 12 point, ingen point i rækkerne, ingen ⓘ og "Ikke spillet" i stedet for "Justeret score". De eksisterende tests bestod, på nær forventningen til 62,28 %, der i samme commit blev 62,3 %.
- **Grøn efter bygningen:**
  - pytest i `api/` med `.venv`: 283 bestået og 3 sprunget over (de to navnetest uden variablen og slutløserens reference), 114 s. Accepttest 7 for 16. november (dobbeltdummy, kontrakterne, mærkerne, rådene og linjen som før) var grøn mod svaret fra før bygningen, inden testsvarene blev lavet igen som i README.
  - `npm test` (tsc og vitest): 9 filer og 104 test bestået på 13 s, også fagords- og bydeformtesten i `src/test/sprog.test.tsx`. `npm run build` bygger.
  - `node tools/tjek_bredde.mjs`: 157 tjek i orden ved 320, 390 og 1280 px på 40 s, nu også med aftenen 16. november og dens 32 spil: ingen vandret rulning, 44 px trykflader og ⓘ åbnet og lukket med mus, tryk (touch), Enter, mellemrum og Escape i en rigtig browser.
- **Neubergs formel og afrundingen:**
  - `regn.neuberg(P, n, N)` giver P' = (P + 1) · N / n − 1 og P uændret, når n = N. `regn.parpoint(S, felt, N)` er Neubergs formel på matchpointene mod feltet med n = feltets antal + 1.
  - N er det største antal rigtige resultater på et spil i sektionen, læst fra `spilresultater.php`. En justeret score ("M", "Justeret til middel") er ikke et resultat og tæller hverken i n eller N. Top er 2 · (N − 1) og middel N − 1 på alle spil.
  - Samme P' bruges for alle fire scorer (faktisk, efter udspil, før udspil og par), så alle forskelle og dermed faktorerne ganges med N / n, og teleskopsummen går op uden særskilt kode.
  - Pointene står uafrundet i svaret. `regn.rund1` runder procenten pr. spil og i alt til én decimal med 0,05 væk fra nul (først til 9 decimaler, så en flydende regnefejl ikke flytter afrundingen). Appen viser parpoint og faktorer i parturnering med én decimal og samme afrunding (`tal(n, 1)`), hele tal uden ",0".
- **De 32 spil og 225,9 / 50,4 %:** point og procent pr. spil stemmer med regnskabet på alle 32 spil, og rundernes summer stemmer med siden. 29 spil havde allerede bridge.dk's point og top. Forskellen fra 223 af 436 kom fra tre spil:
  - spil 7: fire borde meldte pas hele vejen rundt, som spilresultaterne skriver "P". Læsningen kendte kun "Pas", så feltet havde 3 resultater og top 6. Nu er der 7: 0 af 14 som på bridge.dk.
  - spil 16: ét bord med "P": før 10 af 12, nu 12 af 14 som på bridge.dk.
  - spil 32: en justeret score ved et andet bord, så spillet er spillet 7 gange: 5 af 12 bliver (5 + 1) · 8 / 7 − 1 = 5,857, vist som 5,9 point og 41,8 % som på bridge.dk.

  I alt 225,857 af 448 = 50,41 %, vist som 225,9 og 50,4 %. Af forskellen på 12 i toppen (448 − 436) kom 10 fra "P" og 2 fra spil 32, altså mest fra læsningen og ikke kun fra regnemåden, som Formål antog. "I alt mod middel" er +1,857, vist som +1,9: meldinger −8,3, spilføring −11, modspil −34 og held og uheld +55,1 (heraf modpartens fejl +24).
- **Valg, specen ikke afgør:**
  1. "P" læses som pas i `laes.py`. Uden det kan pointene pr. spil ikke stemme; testsiderne fra v1 har ingen "P", og deres svar er uændrede.
  2. Procenten i `resultat` har nu én decimal i svaret (62,28 → 62,3 for 4. november), så appen viser bridge.dk's tal uden dobbelt afrunding. To eksisterende forventninger er rettet tilsvarende (`aften.test.tsx` og `test_cache_og_hent.py`). Ellers er `par-452.json` og begge holdsvar uændrede.
  3. En justeret score ved jeres eget bord (et spil uden kontrakt, men med point i regnskabet) får regnskabets point fra cellen for parrets retning (NS eller ØV). `spillet` er falsk og faktorerne null, og spillets point − middel lægges til aftenens Held og uheld, så summen går op. Rækken viser "Justeret score" med procent og point. Det er kun prøvet med et konstrueret spil; ØV-cellen er ikke prøvet på en rigtig side, fordi par 1 sad Nord–Syd begge aftener.
  4. Scoren stod allerede i rækkens linje ("… · −140"), så højre side af rækken viser nu procenten og under den pointene ("5,9 point").
  5. ⓘ står kun i parturnering, fordi teksten handler om parpoint, og holdturnering er uden for afgrænsningen. Den står kun på oversigten, ikke ved "Hvor gik pointene?" i analysevinduet. Teksten folder sig ud under kortets overskrift (som Fordelingstrænerens ⓘ under 1000 px); trykfladen er 44 × 44 px med en cirkel på 26 px, og Escape lukker teksten og lader fokus stå på ⓘ.
  6. Analysevinduet viser også pointene med én decimal ("5,9 af 14 point"), så tallene er de samme som på oversigten.
  7. Testsiderne er et eget sæt i `anonymiser.py` (`SAET`), og `test_ingen_navne.py` tjekker de sæt, der ligger i mappen. `anonymiser.py` kender ikke stillingen (`resultater.php`), som heller ikke er gemt.
- **Spørgsmål til Frank:**
  1. ⓘ-teksten er forslaget fra specen, ordret. Skal den rettes? Den står i `src/tekster.ts` (`aften.info`) og i `src/test/point.test.tsx`.
  2. Skal ⓘ også stå ved "Hvor gik pointene?" i analysevinduet og i holdturnering (så med en tekst om imp)?
  3. Er "5,9 point" under procenten den rigtige form i rækken, og må hele tal stå uden ",0" ("14 point"), selv om bridge.dk skriver 14,0?
  4. Formål siger, at forskellen kommer af regnemåden, men det meste kom af "P". Skal Formål rettes, før specen arkiveres?
- **Skærmbilleder** (uden for git og kun med anonymiserede data): `C:\Users\frank\Kontraktbridge\skaermbilleder\point-som-bridgedk\` med oversigten for 16. november, `320-aften-3287.png`, `390-aften-3287.png` og `1280-aften-3287.png`, og de samme med ⓘ åben, `…-aften-3287-info.png`.
- **`SYSTEM.md`:** beslutningsloggen har en række for 17. nov. 2026 om Post Mortem 1d, og rækken om testsiderne nævner sættene. Datoen øverst var allerede 17. november 2026.
- **Første session (17. november 2026, stoppet ved testdataene):** aftenen kunne ikke findes på resultater.bridge.dk ud fra koden og bridge.dk uden at gætte, så linket manglede fra Frank.
  - Tag og gren: `main` (`285aef4`, lig med `origin/main`) er tagget `v-foer-point-som-bridgedk`, og grenen er `point-som-bridgedk`. Specen er committet som `719cf59`.
  - Søgningen: Post Mortem får hele linket fra brugeren og søger ikke selv. Testsiderne fra v1 kommer fra hovedklub 2151, klub 1 (onsdag), og den har ikke aftenen. Gennemgået med samme slags adresser, som siderne selv linker til: turneringsoversigten (`overview.php?mainclubno=…&club=1`) for 280 hovedklubber (de 224 klubnumre på DBf's regionale klublister og resten af numrene 2100–2199), klub 2–12, 20 og 99 under hovedklub 2151 (alle tomme) og turneringssiden (`turnering.php`) for alle 145 turneringer, der omfatter 16. november 2026. Ingen hed "Efterårs Hold og Par" eller havde en sektion "Par Gul".
  - Den midlertidige mappe med de hentede oversigter og turneringssider blev slettet.
  - Tokenforbrug (49 svar, målt før den sidste commit): nye input 100, skrevet til cachen 144.974, læst fra cachen 5.395.383 og output 28.310, i alt 5.568.767.
- **Tokenforbrug** (anden session, 106 svar, målt før den sidste commit): nye input 214, skrevet til cachen 271.178, læst fra cachen 20.047.858 og output 124.355, i alt 20.443.605.

## Arbejdsgang

1. Opret tagget og grenen i en frisk session.
2. Skriv accepttestene, som skal være røde, og byg derefter.
3. Stop før merge.
4. Efter Franks "godkendt":
   - Flet, og push.
   - Udrul funktionen med zip som i README.
   - Lav live-tjek på aftenen 16. nov.
   - Arkivér specen, og slet grenen.

Der må ikke være nogen koordinerende session, der venter.
