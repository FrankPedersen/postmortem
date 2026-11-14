# SPEC – Post Mortem, vindue 1b: skvis, slutspil og nøglebeslutninger

13. november 2026 · Frank og rådgiveren (skrevet med Fable 5.2). Plan: `PLAN-postmortem.md`. Funktionen: `SPEC-postmortem-1a-funktion.md` og `api/SVAR.md`. Afprøvningen: `NOTAT-afproevning.md`. Mockup: designlærredet "Post Mortem – mockup".

## Formål

Post Mortem skal vise, i hvilke spil en skvis eller et slutspil giver et stik, hvor i spillet det sker, og hvilke kort der afgør spillet, så Frank kan lære at spotte situationerne. Mærkerne skal være til at stole på: hellere et overset spil end et forkert mærke.

## To dele, to modeller

- **Del A (funktionen): Fable 5.2, høj effort.** Slutstillingsløseren, testsættet, mærkerne, nøglebeslutningerne og udspillet i `api/`. Ingen ændringer i appen.
- **Del B (appen): Opus.** Teknikkortet, filtrene og de to afsnit med råd, bygget på svaret fra del A.

Del A stopper før merge. Rådgiveren gennemgår den (på Opus), før del B begynder.

## Afgrænsning

| Sted | Må ske | Må ikke ske |
| --- | --- | --- |
| `postmortem/api/postmortem/` | nye moduler til løseren, linjen, mærkerne og rådene; nye felter i svaret | ændre faktorerne, pointene, læsningen af bridge.dk, IP-grænsen eller navnereglen |
| `postmortem/api/tests/` | testsættet (`slutstillinger.pbn`, hele spil), nye tests | ændre de eksisterende tests, ud over `test_svar.py` for de nye felter |
| `postmortem/api/SVAR.md` | de nye felter | — |
| `postmortem/src/` (del B) | teknikkortet, filtrene, rådene, teksterne, guiden | ændre de fire faktorer, bordet eller holdvalget |
| Azure | udrulning efter godkendelse | nye ressourcer |
| Forside, Fordelingstræneren, Konventionstræner | intet | alt |

Del A: tag `main` som `v-foer-maerker`, gren `maerker`. Del B: tag `v-foer-raad`, gren `raad`. Ingen nye afhængigheder i `api/` (løseren skrives i ren Python). Kræver noget en ændring ud over tabellen, så stop og spørg.

## Grundidéen: en teknik er nødvendig, når stiktallet falder uden den

Afprøvningen viste to ting: mønstre i kortene giver falske fund, og DDS kan ikke regne på stillinger, hvor en spiller har et kort for meget. Derfor defineres mærkerne ved to tænkte spil, som en lille egen løser regner:

- **Skvis.** En skvis virker, fordi en modspiller skal lægge et kort, han har brug for. I det tænkte spil *uden afkasttvang* må modspilleren **passe**, når han ikke kan bekende: han lægger intet kort og beholder alle sine. Kan spilfører tage færre stik i det spil end i det rigtige, er skvisen nødvendig.
- **Slutspil (indspil).** Et indspil virker, fordi en modspiller er inde og skal spille ud til spilførers fordel. I det tænkte spil *uden udspilstvang* må modspilleren, når han er inde, **give udspillet fra sig**: spilfører skal så selv spille ud, fra hånden eller bordet efter eget valg, og intet stik er brugt. Kan spilfører tage færre stik i det spil, er indspillet nødvendigt.

Med `V` = spilførers dobbeltdummy-stik i det rigtige spil og `B` = stikkene i det tænkte spil er teknikken nødvendig, når `V > B`. Definitionen afhænger ikke af, hvilken linje spilfører vælger, og den siger samtidig, hvad teknikken er værd ("uden skvis 10 stik, med 11").

Valget "spilfører vælger hånd" i det tænkte spil uden udspilstvang er bevidst forsigtigt: et indspil, der kun er nødvendigt, fordi spilfører mangler en indgang til den anden hånd, bliver ikke fundet. Det er en kendt begrænsning (se nederst).

## Slutstillingsløseren (`api/postmortem/slutloeser.py`)

En alfa-beta-løser i ren Python for stillinger med højst `N` kort pr. hånd, med transpositionstabel, ækvivalente kort (kort i følge i samme hånd regnes som ét) og spørgsmål af formen "kan spilførersiden tage mindst k af de resterende stik?".

- Inddata: de fire hænder, trumf, hvem der spiller ud, antal resterende stik, og to tilvalg: `pas_ved_afkast` (en mængde af modspillere) og `giv_udspil` (en mængde af modspillere).
- En modspiller med `pas_ved_afkast` kan ende med kort til overs; spillet slutter, når de resterende stik er spillet.
- Uden tilvalg skal løseren give præcis samme tal som DDS. Det er dens vigtigste test.
- `N` er 6. Kan tidskravet (se Ydeevne) ikke holdes, må `N` sættes til 5, og det skrives i Afklaret.

## Den bedste linje og stillingen `P`

1. **Linjen.** Fra stillingen efter det faktiske udspil spilles en dobbeltdummy-rigtig linje med DDS (`endplay`), hvor begge sider i hvert kort vælger blandt de kort, der holder DD-tallet, efter faste regler:
   - Spilførersiden i udspil: først et kort i en farve, hvor begge modspillere har kort (så ingen tvinges til afkast, og en skvis ikke udløses før tid); ellers den første farve i rækkefølgen ♣ ♦ ♥ ♠; højeste kort i farven.
   - Spilførersiden ellers: vinder stikket så billigt som muligt, ellers laveste kort.
   - Modspillerne: laveste kort; ved afkast fra den længste farve; i udspil den første farve i rækkefølgen ♣ ♦ ♥ ♠.
   - Kort i følge i samme hånd: det laveste.
   Reglerne står ét sted og har en test, der viser, at linjen er den samme ved hver kørsel.
2. **Ukendt udspil.** Står udspillet forkert på bridge.dk, bruges modspillets bedste udspil efter reglerne ovenfor, og svaret siger `udspilAntaget: true`.
3. **`P`** er stillingen på linjen, når der er `N` stik tilbage (med `N` = 6: efter stik 7). `V` er spilførersidens DD-stik fra `P`.

## Mærkerne

Regnes for kontrakten ved brugerens bord, uanset om brugeren var spilfører eller modspiller. Spil med `spillet: false` får ingen.

**Skvis.** `B_afkast` = stik fra `P` i spillet, hvor begge modspillere må passe ved afkast. Skvis, når `V > B_afkast`.
- Retning: regn også med kun Vest og kun Øst. Falder tallet kun for den ene, er skvisen mod ham; falder det for begge hver for sig, er det en dobbeltskvis (`"begge"`); falder det kun, når begge må passe, er det `"en af dem"`.
- Skvisstikket: det sidste stik på linjen efter `P`, hvor den skviste modspiller ikke kan bekende, og hvor tallet stadig falder, hvis han må passe fra det stik og frem. Skviskortet er det kort, der blev spillet ud til stikket. Farverne er de farver, modspilleren har kort i ved det stik.

**Slutspil (indspil).** `B_udspil` = stik fra `P` i spillet, hvor begge modspillere må give udspillet fra sig. Slutspil, når `V > B_udspil`.
- Retning som for skvis.
- Indspilsstikket: det sidste stik på linjen efter `P`, som modspilleren vinder og derefter skal spille ud fra, og hvor tallet stadig falder, hvis han må give udspillet fra sig fra det stik og frem. Indspilskortet er det kort, spilførersiden spillede til stikket.

**Kast-ind-skvis.** Begge mærker mod samme modspiller, med skvisstikket før indspilsstikket.

Finder løseren en nødvendig teknik, men intet stik på linjen (bør ikke ske), gives mærket uden stik, og spillet skrives i en liste i Afklaret.

Andre teknikker (eliminering, dyk og hold-up, trumfkup, Morton's Fork, Vienna Coup som eget mærke, sikkerhedsspil) er ikke med i 1b. Sikkerhedsspil kan ikke defineres dobbeltdummy, fordi sidningen er kendt.

## Nøglebeslutninger

Et kort på linjen er en **nøglebeslutning**, når:

1. spilleren har mindst tre muligheder, hvor kort i følge i samme farve tæller som én mulighed,
2. højst én af mulighederne holder DD-tallet, og
3. den ikke er triviel: reglen gælder ikke, når den eneste rigtige mulighed er at bekende med det eneste kort, der vinder stikket, eller at trumfe et stik, der ellers tabes.

Med præcis to muligheder (fx stik eller dyk, kipning eller top) er kortet kun en nøglebeslutning, når det hører til et skvis- eller indspilsmærke (skviskortet, indspilskortet og det stik, hvor tællingen rettes ved at afgive et stik).

For hver side (spilfører og modspil) vises højst tre pr. spil, i denne rækkefølge: kort, der hører til et mærke; derefter det tidligste stik først. For hver nøglebeslutning gemmes stikket, hånden, kortet, DD-tallet og de to dyreste alternativer med deres tal.

Reglerne kalibreres på de 48 anonymiserede spil: fordelingen (antal spil med 0, 1, 2 og 3 nøglebeslutninger pr. side) skrives i Afklaret. Har over halvdelen af spillene tre for spilfører, er reglen for løs; så strammes punkt 2 til "præcis én", og det skrives i Afklaret.

## Udspillet

Fra stillingen før udspil regnes DD-tallet for hvert muligt udspil (ét DDS-kald). Svaret får: det faktiske udspils pris i stik i forhold til det bedste, og de udspil, der holder spilfører på færrest stik (som muligheder, kort i følge samlet).

## Svaret

`api/SVAR.md` og `test_svar.py` udvides. Pr. spil:

- `maerker`: liste af `"skvis"`, `"slutspil"` (tom som nu, når ingen).
- `teknik`: `beregnet` (false med `grund`, når spillet ikke er spillet, eller tiden løb ud), `udspilAntaget`, `stikFoerP`, og for hvert mærke: `mod` (`W`, `E`, `begge`, `en af dem`), `stik`, `kort`, `farver` (kun skvis), `medTeknik` (`V` omregnet til stik i hele spillet) og `udenTeknik` (tilsvarende for `B`), samt `kastIndSkvis`.
- `raad`: `spilfoering` og `modspil` (lister af nøglebeslutninger) og `udspil` (`faktisk`, `pris`, `bedste`).
- `linje`: den bedste linje som 13 stik med fire kort og vinder (til appens visning af stillingen ved skvisstikket).

For aftenen: antal spil med hvert mærke, og for de spil, hvor brugerens side var spilfører: i hvor mange de tog DD-stikkene.

Teksterne skrives i appen ud fra felterne; funktionen sender ingen sætninger. Resultaterne gemmes i cachen med samme nøgle som DD-beregningerne. Ingen navne.

## Testsættet

### Slutstillinger (`api/tests/data/slutstillinger.pbn`)

Skrevet i hånden af rådgiveren og regnet igennem, men **ikke kørt i DDS**. Første skridt er at lade DDS bekræfte `V` for hver. Stemmer et tal ikke, så ret ikke stiltiende: skriv afvigelsen i Afklaret med DDS' tal, og ret stillingen, så den viser det, den skal.

Syd er spilfører og skal spille ud. Sans, hvor intet andet står. PBN-rækkefølgen er N, Ø, S, V; farverne ♠.♥.♦.♣.

| Nr. | Stilling (PBN) | Hvad den viser | `V` | Forventet |
| --- | --- | --- | --- | --- |
| T1 | `N:AJ.K.. ..987. 4.2..A KQ.A..` | Positionel simpel skvis: Vest vogter spar og hjerter og kaster før bordet | 3 | skvis mod V, stik 1, kort ♣A, farver ♠♥, uden: 2 |
| T2 | `N:AJ.K.. KQ.A.. 4.2..A .5.98.` | Samme, men holdet sidder hos Øst bag bordet | 2 | ingen |
| T3 | `N:AJ..2. KQ.A.. 4.K..A ..987.` | Automatisk skvis: bordet har et frit kort, truslen ♥K er hos Syd | 3 | skvis mod Ø, stik 1, uden: 2 |
| T4 | `N:J.A4.. .J8.A. .3.J.A A.Q7..` | Dobbeltskvis: Vest holder spar, Øst ruder, begge hjerter | 3 | skvis mod begge, stik 1, uden: 2 |
| T5 | `N:43.2.. ..987. AQ.3.. KJ.A..` | Indspil: Vest sættes ind på ♥A og må spille op i ♠AQ | 2 | slutspil mod V, indspilskort ♥3 i stik 1, uden: 1 |
| T6 | `N:43.2.. .A.87. AQ.3.. KJ..9.` | Samme, men ♥A sidder hos Øst | 1 | ingen |
| T7 | `N:43.54.. ..9876. AQ.3..A KJ.AK..` | Kast-ind-skvis: Vest må kaste en hjertervinder på ♣A og sættes så ind | 3 | skvis mod V (stik 1) og slutspil mod V (stik 2), kast-ind-skvis, uden: 2 |
| T8 | `N:A9.K.. JT8... 4.2..A KQ.A..` | Begge modspillere holder spar | 2 | ingen |
| T9 | `N:AJ.A3..2 KQ.K5.9. 4.Q2..AK ..87654.` | Vienna Coup: ♥A skal indkasseres først, ellers er bordet selv i klemme | 5 | skvis mod Ø i stik 3; nøglebeslutning i stik 1: ♥2 til esset (andre kort: højst 4 stik) |
| T10 | `N:7.43..2 ..9876. 8.AQ..3 .KJ.5.A` (spar trumf) | Indspil i trumf: Vest må spille op i ♥AQ eller til dobbeltrenonce | 3 | slutspil mod V, indspilskort ♣3 i stik 1, uden: 2 |
| T11 | `N:AJ.K.2. ..8765. 4.2.3.A KQ.A.9.` | Tællingen passer ikke: Vest har et frit kort | 2 | ingen |

Tilføj selv mindst seks stillinger, som DDS bekræfter, og beskriv dem i samme tabel i Afklaret: en simpel skvis i en trumfkontrakt, en skvis hvor tællingen først skal rettes ved at afgive et stik, et indspil efter eliminering med fem eller seks kort, og tre negative, der ligner de positive (fx en kipning, der sidder, så indspillet ikke er nødvendigt; et afkast, hvor modspilleren har et frit kort; en trussel uden indgang).

### Hele spil (`api/tests/data/helespil.pbn`)

- Mindst fire hele spil bygget ved at udvide slutstillinger (T1, T4, T5 og T7 eller tilsvarende) med syv tidlige stik og et udspil, så linjen fører til stillingen. De skal give samme mærker som slutstillingen.
- Mindst to hele spil uden mærker.
- De tre spil fra afprøvningen (`testspil.pbn`). Resultatet skrives i Afklaret; rådgiveren afgør, om det er rigtigt. Lektionens slutspil i spil 1 forventes ikke fundet, fordi dobbeltdummy giver 9 stik uden.

## Accepttest for del A (skrives først)

1. **Løseren = DDS:** uden tilvalg giver løseren DDS' tal på alle slutstillinger og på 300 tilfældige stillinger (3–6 kort pr. hånd, sans og trumf, alle fire i udspil; fast frø).
2. **`V` i testsættet** er som i tabellen (eller afvigelsen står i Afklaret).
3. **Mærkerne** på slutstillingerne er som forventet: mærke, retning, stik, kort og `uden`.
4. **Hele spil** giver de forventede mærker, og de negative giver ingen.
5. **Nøglebeslutninger:** T9 giver ♥2 til esset i stik 1, T5 giver ♥3, T10 giver ♣3; ingen side har mere end tre pr. spil.
6. **Udspil:** prisen stemmer med `S_ddEfter` og `S_ddFoer` fra 1a på de 48 spil (samme forskel i stik).
7. **Uændret:** alle tests fra 1a og 1c er grønne, og faktorerne i de to testsvar er de samme som før.
8. **Linjen** er den samme ved hver kørsel, og hvert kort på den holder DD-tallet.
9. **Svaret:** `SVAR.md` beskriver de nye felter, og navnetesten er grøn.
10. **Oversigt til gennemgang:** Afklaret har en tabel over alle mærker på de 48 anonymiserede spil (turnering, spil, kontrakt, mærke, mod, stik, kort, med og uden) og fordelingen af nøglebeslutninger.

## Ydeevne

Mål først. Kravet er, at en aften med 32 spil uden cache analyseres på under 60 sekunder i GitHub Actions, og at et enkelt spil aldrig tager over 10 sekunder (derover: `beregnet: false`, `grund: "tid"`). Kan kravet ikke holdes med `N` = 6, så prøv `N` = 5. Holder det heller ikke, så stop og beskriv målingerne og to mulige løsninger; byg ikke en ny arkitektur uden at spørge.

## Del B: appen (Opus, efter godkendelse af del A)

- **Aftenens oversigt:** kortet "Teknikker i aftenens spil" med Skvis og Slutspil og antal spil, og linjen "Taget ved jeres bord: x af y" for de spil, hvor I var spilfører. Filtrene "Skvis · n" og "Slutspil · n". Spillisten viser mærkerne "Skvis mulig" og "Slutspil muligt".
- **Analysevinduet, Råd til spilføringen:** mærket med stik ("Skvis mulig · stik 9"), linjen "Uden skvisen 10 stik, med 11", nøglebeslutningerne som i mockuppen (stik, kort, og hvad de to dyreste alternativer giver), stillingen ved skvis- eller indspilsstikket som et lille bord, boksen "Sådan spotter du den" med en fast tekst pr. teknik, og links til ordbogens Skvis, Slutspil og Indspil.
- **Analysevinduet, Råd til modspillet:** udspillets pris og de bedste udspil, modspillets nøglebeslutninger, og ved et mærke: mod hvem, og at det bedste modspil ikke kan forhindre det. Afsnittet står først, når brugeren var i modspil.
- **Guiden og noten** siger: rådene gælder den bedste linje efter udspillet og ikke det, der blev spillet; teknikker findes i de sidste seks stik; et indspil, der kun skyldes en manglende indgang, findes ikke; `udspilAntaget` vises som "udspillet står forkert på bridge.dk; analysen bruger det bedste udspil".
- **Tekster:** dansk, beskrivende form, husets ord (bordet, kipning, forbindelser, indkassere). Teksterne samles i `src/tekster.ts`.
- **Tests:** vitest på to nye testsvar (kørt mod de anonymiserede sider), bredde ved 320 px, og at et spil uden mærker ikke viser tomme afsnit.

## Trin

1. Del A: tag og gren; accepttestene (røde); løseren; linjen; mærkerne; nøglebeslutningerne; udspillet; svaret; måling. **Stop før merge.**
2. Rådgiveren gennemgår tabellen over mærker og et udvalg af spil i hånden.
3. Efter Franks godkendelse: merge og udrulning af funktionen; live-tjek af to aftener.
4. Del B på Opus: tag og gren; tests; appen. **Stop før merge.** Efter godkendelse: merge, udgivelse og live-tjek.

## Kendte begrænsninger (skal stå i guiden)

- Alt er dobbeltdummy: en teknik er "nødvendig", når den er den eneste vej med åbne kort. Ved bordet kan en kipning være lige så god.
- Skvis og indspil, der afgøres, før der er seks kort tilbage, findes ikke.
- Indspil, der kun er nødvendige, fordi spilfører mangler en indgang, findes ikke.
- Linjen er én af flere rigtige; rådene viser de kort, hvor der kun er én rigtig mulighed.

## Til afgørelse (Frank)

1. **Navnet på mærket:** mockuppen siger "Slutspil muligt". Ordbogen bruger Slutspil som overbegreb og Indspil om netop det at sætte en modspiller ind. Specen beholder "Slutspil muligt" som mærke og skriver "indspil" i forklaringen. Alternativet er mærket "Indspil muligt".
2. **Spil, hvor I var i modspil:** mærkerne vises også dér ("Skvis mulig mod jer"). Det er specens valg.

## Afklaret

### Del A (Claude Code, Fable 5.2, 13.–14. november 2026)

Bygget på grenen `maerker` (før: `v-foer-maerker`). Ikke flettet og ikke udrullet; appen (`src/`) er ikke rørt. Grenen er pushet, så testene også kører på Linux; `main` er uændret.

#### 1. DDS og slutstillingerne i specen

DDS bekræfter `V` i alle 11 stillinger (T1 3, T2 2, T3 3, T4 3, T5 2, T6 1, T7 3, T8 2, T9 5, T10 3, T11 2). Tre stillinger viste alligevel ikke det, de skulle. De er rettet i `slutstillinger.pbn`, og specens udgaver står ved siden af som T7a, T9a og T10a med det, de faktisk giver.

| Nr. | Afvigelse | DDS' og løserens tal | Rettet stilling |
| --- | --- | --- | --- |
| T7 | Indspillet er ikke nødvendigt. Kaster Vest ♥K på ♣A, har Øst ingen hjerter, så bordets ♥5 bliver god: Syd får 3 stik, også når Vest må give udspillet fra sig | `V` = 3; uden afkasttvang 2; uden udspilstvang 3 (ikke 2) | `N:43.54.. .76.98. AQ.3..A KJ.AK..`: Øst har ♥76 over bordets ♥54. `V` = 3, uden afkasttvang 2, uden udspilstvang 2: skvis i stik 1, indspil i stik 2, kast-ind-skvis |
| T9 | ♥D holder også 5 stik: efter ♥D, ♥K, ♥E er Syds ♥2 en trussel mod Østs ♥5, fordi Vest ingen hjerter har | ♥2 5, ♥D 5, ♣E/♣K 4, ♠4 4 | `N:AJ.A3..2 KQ.K5.9. 4.Q2..AK .76.876.`: Vest har ♥76. ♥2 5, ♥D 4, ♣ 4, ♠4 4 |
| T10 | ♠8 holder også 3 stik: Vest har kun ét frit kort, så efter trumfen har han ingen udgang, når han sættes ind | ♣3 3, ♠8 3, ♥E 2, ♥D 2 | `N:7.43..52 ..QJT98. 8.AQ..43 .KJ.65.A` (spar trumf, fem kort): Vest har to rudere, så trumfen ikke kan trækkes først. `V` = 4: ♣3/♣4 4, ♥E 3, ♥D 3, ♠8 2; uden udspilstvang 3 |

T7a giver kun skvis (mod V, stik 1, ♣E, uden: 2). T9a giver skvisen mod Ø i stik 3 som forventet, men ingen nøglebeslutning i stik 1. T10a giver indspillet som forventet (mod V, ♣3 i stik 1, uden: 2), men ingen nøglebeslutning i stik 1.

#### 2. Tilføjede slutstillinger

Alle er bekræftet af DDS (`V`), og de to tænkte spil er regnet af løseren og af den uafhængige reference (afsnit 4).

| Nr. | Stilling (PBN) | Hvad den viser | `V` | Resultat |
| --- | --- | --- | --- | --- |
| T12 | `N:.AJ.K.2 ...AQJT 98.4.3. .KQ.A.K` (spar trumf) | Simpel skvis i en trumfkontrakt: den sidste trumf er skviskortet, og Vest har først et frit kort (♣K) | 4 | skvis mod V, stik 2, kort ♠9, farver ♥♦, uden: 3 |
| T13 | `N:AJ.K.2.5 ..A.QJT9 4.2.3.AK KQ.A.98.` | Tællingen rettes først: Syd afgiver en ruder til Østs es, og derefter er Vest i skvis på den sidste klør | 4 | skvis mod V, stik 3, kort ♣E, farver ♠♥, uden: 3 |
| T14 | `N:76.2.43.2 .T98.T98. 98.A.AQ.3 .QJ.KJ.AK` (spar trumf) | Indspil efter eliminering med seks kort: ♥E indkasseres, og Vest sættes ind i klør (♣3 i stik 1 giver kun 4) | 5 | slutspil mod V, stik 2, indspilskort ♣3, uden: 4 |
| T15 | `N:43.2.A. KJ..T9. AQ.3.2. .AK.QJ.` | Ligner T5, men kipningen sidder, og bordet har en indgang | 3 | ingen |
| T16 | `N:AJ..32. KQ.A.9. 4.K.4.A ..QJT8.` | Ligner T3, men Øst har et frit kort, og tællingen kan ikke rettes | 2 | ingen |
| T17 | `N:J3.K.. ..987. A.2..A KQ.A..` | Ligner T1, men spartruslen på bordet har ingen indgang | 2 | ingen |

I T13 holder både ♦3 og klørene DD-tallet i stik 1, så stikket, hvor tællingen rettes, er ikke en nøglebeslutning dér. I T14 holder trumferne også DD-tallet i stik 2, så ♣3 er indspilskort, men ikke nøglebeslutning.

#### 3. Hele spil (`helespil.pbn`)

Syd er spilfører i alle seks; spillene er konstruerede og har ingen navne. DDS bekræfter DD-tallet efter udspillet.

| Spil | Kontrakt, udspil | Bygget på | Resultat |
| --- | --- | --- | --- |
| H1 | 7NT, ♦B | T1 | skvis mod V, stik 11, ♣E, farver ♠♥, med 13, uden 12 |
| H2 | 7NT, ♣2 | T4 | skvis mod begge, stik 11, ♣E, farver ♠♥♦, med 13, uden 12 |
| H3 | 6NT, ♣2 | T5 | slutspil mod V, stik 10, indspilskort ♥3, med 12, uden 11 |
| H4 | 6NT, ♣3 | T7 | skvis mod V i stik 10 (♣E) og slutspil mod V i stik 11 (♥3): kast-ind-skvis, med 12, uden 11 |
| H5 | 6NT, ♣2 | H3 med ♠K hos Øst | ingen (kipningen giver 12 stik) |
| H6 | 4♠, ♣K | almindelig udgang | ingen |

Mine første udgaver af H2 og H3 blev ikke fundet, og begge gange havde løseren ret. I den første H2 kunne Syd tage en kipning gennem den modspiller, der skulle skvises, så skvisen ikke var nødvendig. I den første H3 var Vest uden udgang allerede i stik 6, så indspillet lå før `P`; det er specens kendte begrænsning set i praksis. Begge spil er bygget om, så teknikken ligger i de sidste seks stik.

De tre spil fra afprøvningen (`testspil.pbn`) giver ingen mærker:

| Spil | Kontrakt, udspil | DD efter udspil | Udspillets pris | Mærker | Nøglebeslutninger (spilføring) |
| --- | --- | --- | --- | --- | --- |
| 1 (lektionens slutspil) | 3NT, ♥D | 9 | 1 (♠6 og ♠10 holder Syd på 8) | ingen, som ventet: dobbeltdummy giver 9 stik uden slutspil | stik 3 ♣E fra bordet, stik 5 ♦4 fra bordet, stik 9 ♠K |
| 2 (frafald) | 3NT, ♦D | 9 | 0 | ingen | stik 8 ♣8; modspil: stik 5 ♠D fra Vest |
| 3 (almindeligt) | 1NT, ♦D | 7 | 0 | ingen | stik 11 ♠5 |

I spil 2 er frafaldet i stik 1 ikke en nøglebeslutning. ♦K fra bordet og ♦E fra hånden koster hver et stik (8 mod 9), men både bordet (♦6 og ♦8) og hånden (♦5 og ♦7) har to små kort, der holder DD-tallet, og de tæller som to muligheder, fordi de ikke står i følge. Reglen overser altså et frafald, når hånden har to små kort med et andet kort imellem. Jeg har ikke ændret reglen. Rådgiveren afgør, om resultaterne er rigtige.

#### 4. Slutstillingsløseren (`api/postmortem/slutloeser.py`)

- Ren Python, ingen nye afhængigheder. Stillingen holdes som fire strenge, én pr. farve, med ejeren af hvert kort fra det højeste til det laveste. Kun de kort, der er tilbage, står i strengen, så kort i følge er nabotegn, og to stillinger med samme mønster deler plads i transpositionstabellen. Spørgsmålet er "kan spilførersiden tage mindst k af de resterende stik?".
- **Løseren = DDS:** uden tilvalg giver den DDS' tal på alle 20 slutstillinger med alle fire i udspil og på 300 tilfældige stillinger (3–6 kort pr. hånd, sans og trumf, alle fire i udspil, fast frø). Uden for testene er den også sammenlignet med DDS på 4000 tilfældige stillinger: ingen afvigelser.
- **De to tænkte spil** kan DDS ikke regne. De er derfor sammenlignet med en uafhængig, langsom reference (minimax uden ækvivalente kort og uden transpositioner over farvemønstre; `tests/test_slutloeser.py`) på 120 tilfældige stillinger med 3–4 kort for hvert af de seks tilvalg (begge, kun Øst, kun Vest; afkast og udspil) og på alle slutstillinger med højst fem kort: samme tal overalt.
- Løseren kan også spørges midt i et stik (`igang`); det bruges, når modspillernes kort på linjen vælges (afsnit 5).
- `N` er 6. Der var ikke brug for at gå ned til 5.

#### 5. Linjen, mærkerne og det, specen ikke sagde

Linjens regler står i `api/postmortem/linje.py`, mærkerne og nøglebeslutningerne i `api/postmortem/teknik.py`. Disse valg er truffet undervejs; det første er en afvigelse fra specens regler, resten er præciseringer.

1. **Modspillerne holder igen efter `P` (afvigelse).** Med specens regel alene ("ved afkast fra den længste farve") kaster en modspiller i skvis ofte en garde, før han skal: alle hans afkast holder DD-tallet, fordi skvisen alligevel kommer. I T9 kaster Øst da ♠D i stik 2, og skvisstikket bliver stik 2 med ♣2 som skviskort, ikke stik 3 som specen forventer. Efter `P` vælger modspillerne derfor, blandt de kort der holder DD-tallet, først et kort, hvorefter teknikken stadig er nødvendig (målt med løseren i det tænkte spil); først derefter gælder specens regel. Det samme gør, at Øst i T9a dækker ♥D, og at Vest i T7 kaster en hjerter og ikke en spar. Før `P` gælder specens regler uændret, fordi løseren ikke kan regne på mere end seks kort.
2. **Lige lange farver ved afkast:** den første i rækkefølgen ♣ ♦ ♥ ♠.
3. **Spilførersiden, når den ikke er i udspil:** "vinder stikket så billigt som muligt" gælder ikke, når makker allerede har stikket; så spilles det laveste kort. Ved afkast spilles helst ikke en trumf.
4. **`mod` er pladsen** (`N`, `E`, `S`, `W`), fordi spilfører kan sidde alle fire steder; `begge` og `en af dem` som i specen. Skvisstikket ved `begge` og `en af dem` er det sidste stik, hvor mindst én af dem ikke kan bekende, og hvor tallet falder, når begge må passe. `farver` er da farverne hos dem, der ikke kan bekende (T4: ♠♥♦).
5. **Indspilsstikket** skal være et stik, modspilleren vinder uden selv at have spillet ud; ellers ville et stik, hvor han indkasserer en vinder efter indspillet, blive valgt. Indspilskortet er det første kort, spilførersiden lagde i stikket. Er modspilleren allerede inde ved `P`, og vandt han stik 7 uden selv at spille ud, er indspilsstikket stik 7 (tallet "fra det stik og frem" kan ikke regnes med syv kort, så faldet ved `P` bruges). Det forekom ikke i testene.
6. **Mærke uden stik:** ingen forekomster, hverken i testsættet eller på de 48 spil.
7. **Nøglebeslutning:** "højst én holder DD-tallet" er det samme som "præcis én", fordi kortet på linjen altid holder det. Specens stramning til "præcis én" har derfor ingen virkning (se afsnit 8). "Triviel" gælder kun, når modparten har stikket: at overtage makkers stik med det eneste højere kort er ikke trivielt. Et kort "hører til et mærke", når det er skviskortet, indspilskortet eller spilførersidens kort i et stik efter `P` og før skvisstikket, som modspillet vinder (tællingen rettes). Det faktiske udspil er ikke med; det står i `raad.udspil`.
8. **Svaret:** `teknik.skvis` og `teknik.slutspil` er objekter (null uden mærke). `medTeknik` er DD-tallet efter udspillet, `udenTeknik` stikkene før `P` plus tallet i det tænkte spil med begge modspillere. `grund` kan også være `pas` (spillet er passet ud) og `fejl` (en uventet fejl i teknikken logges uden kort og navne, og resten af analysen går igennem). Aftenen har `teknikker`: for hvert mærke `spil`, `somSpilfoerer` og `taget` (parret var spilfører og tog mindst `medTeknik` stik), og `spilfoerer` med `spil` og `ddStik`. Jeg har læst specens "i hvor mange de tog DD-stikkene" som begge tal; del B kan vælge.
9. **Cachen:** samme nøgle som DD efter udspil plus `/teknik`. En analyse, der løb tør for tid eller fejlede, gemmes ikke. Processen husker desuden de seneste 2000 analyser.
10. **Den udgivne app** læser ikke `maerker` (den udleder sit eget mærke af faktorerne) og kender ikke de nye felter, så funktionen kan udrulles før del B, uden at appen ændrer sig.

#### 6. Ydeevne

Målt før resten blev bygget på løseren, og igen til sidst.

| Måling | Resultat |
| --- | --- |
| DD-linje med DDS, 52 kort, de 48 spil (Franks pc) | 84 ms pr. spil i gennemsnit, værste 231 ms |
| Løseren, 100 tilfældige stillinger med seks kort, "mindst `V` stik?" | uden tilvalg: median 1 ms, værste 12 ms; med afkast eller udspil for begge: median 2 ms, værste 41 ms |
| Hele analysen af 452 (32 spil) uden cache, Franks pc | 3,1 s, heraf teknikken 1,7 s; pr. spil median 41 ms, værste 163 ms |
| Hele analysen af 450 (16 spil) uden cache, Franks pc | 1,3 s, heraf teknikken 0,75 s; værste spil 155 ms |
| GitHub Actions (ubuntu-latest) | testen "32 spil uden cache under 60 s og intet spil over 10 s" er grøn; den langsomste test, der analyserer hele 452, tager 6,4 s |

Kravet (60 s pr. aften, 10 s pr. spil) holdes med `N` = 6 med stor margin.

#### 7. Mærker på de 48 anonymiserede spil

Tre mærker i 48 spil (32 i 452 og 16 i 450, hold 2-NS). Ingen kast-ind-skvis, ingen `begge` og ingen `en af dem`.

| Turnering | Spil | Kontrakt | Mærke | Mod | Stik | Kort | Med | Uden |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 452 | 3 | 2NT i Nord, udspil ♣8 | skvis | V | 9 | ♦E (farver ♠♥) | 10 | 9 |
| 452 | 18 | 3NT i Syd, udspil ♠6 | slutspil | Ø | 9 | ♥B | 10 | 9 |
| 450 | 9 | 2♠ i Vest, udspillet står forkert (♥10), antaget ♣3 | slutspil | N | 11 | ♥7 | 10 | 9 |

Gennemgået i hånden:

- **452, spil 3.** Efter stik 7 har Vest ♠EDT ♥D64 og skal kaste to gange på ♣D og ♦E. Han må holde ♥D64 mod bordets ♥KT9 og sparene over Syds ♠B. På ♦E kaster han ♠10, og Syd rejser et sparstik: ♠B til damen og kongen, ♠9 til esset, og Vest må spille hjerter til bordets konge, hvorefter ♠2 står. Må Vest passe, får Syd 9. Parret var spilfører og fik 10 stik.
- **452, spil 18.** Efter stik 7 er Vest inde og spiller hjerter. Bordet tager ♥E og spiller ♥B til Østs konge; Øst indkasserer ♥10 og må så spille ruder fra ♦DT8 op i bordets ♦EB. Må Øst give udspillet fra sig, skal bordet selv åbne ruderen og taber et stik. Parret var spilfører og fik 11 stik (modspillet gav et stik mere).
- **450, spil 9.** Spilfører (Vest) spiller ♥7 fra hånden i stik 11; Nord har kun ♥E og ♦K7 tilbage, vinder og må spille ruder op i ♦D hos bordet og ♦E i hånden. Holdet sad i modspil (NS) og gav 10 stik.

#### 8. Nøglebeslutninger: fordelingen på de 48 spil

| Side | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Spilføring (med loftet på tre) | 21 | 9 | 3 | 15 |
| Modspil (med loftet på tre) | 34 | 11 | 1 | 2 |

15 af 48 spil (31 %) har tre for spilfører, altså under halvdelen, så reglen er ikke strammet. Uden loftet er fordelingen for spilfører 0: 21, 1: 9, 2: 3, 3: 7, 4: 5, 5: 1, 6: 1 og 8: 1, og for modspillet 0: 34, 1: 11, 2: 1, 4: 1 og 5: 1.

Til rådgiveren: 53 af spilførers 75 nøglebeslutninger (uden loft) er udspil til et stik, og flest ligger i stik 8–10. En del af dem er "indkassér en vinder frem for at afgive et stik" (i H1 og H2 fx hver klør i en gående farve, fordi de to andre farver koster). De opfylder reglen, men lærer ikke meget. Skal de væk, kunne reglen kræve, at mindst ét alternativ også vinder stikket, eller at kortet ikke er en topvinder i udspil. Jeg har ikke ændret reglen.

#### 9. Udspillet

På de 41 spil med kendt udspil er `raad.udspil.pris` lig `ddEfter − ddFoer`; 13 udspil koster mindst ét stik. I 7 spil står udspillet forkert på bridge.dk (452: spil 7, 11, 16 og 20; 450: spil 9, 12 og 14); dér er `udspilAntaget` sand, `pris` er null, og linjen begynder med det første af de bedste udspil efter modspillets regel.

#### 10. Tests

- Nye: `test_slutloeser.py` (accepttest 1 og 2, tilvalgene mod referencen), `test_maerker.py` (3, 4 og 5), `test_linje.py` (8), `test_teknik_svar.py` (6, 7, 9 og ydeevnen) og læseren `pbnfil.py`. Accepttestene blev skrevet og committet røde, før løseren blev skrevet (`34d9e72`).
- Ændret: kun `test_svar.py`, for de nye felter. `conftest.py` og de øvrige tests fra 1a, 1c og ip-graense er urørte og grønne.
- Uændret (accepttest 7): faktorerne, pointene og alle andre felter end de nye er ens med testsvarene i `src/test/data/` for 452 og 450.
- I alt 255 tests: 254 grønne og 1 sprunget over lokalt (referencen på seks kort); på Linux i GitHub Actions 252 grønne og 3 sprunget over (de to navnetjek, der kræver `_lab`, og samme).

#### 11. Åbent

- Franks to afgørelser i specen står stadig: navnet på mærket ("Slutspil muligt" eller "Indspil muligt"), og om mærkerne vises, når parret var i modspil. Funktionen sender mærkerne i begge tilfælde.
- `README.md` og `CLAUDE.md` i repoet nævner ikke de nye moduler endnu; de står ikke i afgrænsningen, så jeg har ikke rettet dem. Det kan ske ved fletningen.
- Testsvarene i `src/test/data/` har ikke de nye felter; de laves igen i del B.

#### 12. Franks godkendelse med ændringer (14. november 2026)

Del A er godkendt med tre ændringer i nøglebeslutningerne, navnet på mærket og dokumentationen. De er bygget på grenen `maerker` før fletningen.

**Navnet.** Mærket hedder `indspil` i svaret, ikke `slutspil`: i `maerker`, `teknik.indspil`, `teknikker.indspil` og `maerke` på en nøglebeslutning. `SVAR.md`, testene og testsættet (`Indspil` i de to pbn-filer) er rettet. Hvor afsnit 1–11 ovenfor skriver "slutspil" om mærket, hedder det nu "indspil". Franks første afgørelse i specen er dermed truffet; den anden (mærkerne vises også, når parret var i modspil) er uændret specens valg.

**Nøglebeslutninger.**

- **(a) Udspil:** et kort, der spilles ud, tæller kun, når det ikke er en topvinder, eller når mindst ét andet kort på hånden også vinder stikket. En topvinder er et kort, modparten hverken kan stikke eller trumfe. Reglen gælder også skviskortet og indspilskortet: skviskortet i T1 (♣E, Syds eneste vinder) er ikke længere en nøglebeslutning, men står stadig i `teknik.skvis.kort`. I T7 tæller ♣E stadig, fordi ♠E også vinder stikket.
- **(b) Dyk:** valget mellem at vinde stikket og at dykke tæller, når kun det at dykke holder DD-tallet: modparten har stikket, spilleren bekender og kan stikke over, og hvert kort, der stikker, koster. Det gælder med to muligheder og også, når hånden har flere små kort, der alle holder. At stikke, når det er det eneste rigtige, er stadig trivielt (specens punkt 3), og at lade makkers stik gå er ikke et dyk.
- **(c) Kort på samme hånd regnes som ét, når intet kort uden for hånden ligger imellem dem.** Det er den regel, koden allerede brugte (kort på en anden hånd eller i det igangværende stik skiller), så (c) ændrer ikke tallene. Til rådgiveren: frafaldet i spil 2 kunne ikke vises med (c) alene, fordi ♦7 ligger i Syds hånd mellem bordets ♦8 og ♦6, og bordets ♦6 ligger i stikket mellem Syds ♦7 og ♦5. Derfor er (b) bygget på valget mellem de to slags kort (dem, der stikker, og dem, der ikke gør), ikke på antallet af muligheder. Skulle (c) i stedet betyde, at makkers kort ikke skiller, er det en ændring, jeg ikke har lavet.

**Frafaldet i spil 2 fra afprøvningen** (3NT i Syd, ♦D ud) står nu som to nøglebeslutninger i stik 1:

| Stik | Hånd | Kort | DD | Alternativ |
| --- | --- | --- | --- | --- |
| 1 | Nord (bordet) | ♦6 | 9 | ♦K: 8 stik |
| 1 | Syd | ♦5 | 9 | ♦E: 8 stik |

Den tredje for spilfører i spil 2 er endnu et dyk (stik 5: ♠2 fra bordet, ♠E koster et stik); stik 8 ♣8 fra før er faldet ud af de tre, fordi listen viser de tidligste først.

**Den nye fordeling på de 48 spil:**

| Side | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Spilføring (med loftet på tre) | 21 | 15 | 4 | 8 |
| Modspil (med loftet på tre) | 37 | 8 | 2 | 1 |

8 af 48 spil (17 %) har nu tre for spilfører, mod 15 før. Uden loftet: spilføring 0: 21, 1: 15, 2: 4, 3: 5, 4: 1 og 5: 2 (52 i alt, mod 75 før), og modspil 0: 37, 1: 8, 2: 2 og 5: 1. 27 af spilførers 52 er udspil (før 53 af 75). Mærkerne er uændrede: de samme tre spil som i afsnit 7.

**Dokumentationen.** `README.md` og `CLAUDE.md` i repoet beskriver nu `linje.py`, `slutloeser.py`, `teknik.py` og testsættet.

**Tests.** `test_maerker.py` har fået to tests: frafaldet i spil 2, og at en topvinder i udspil kun tæller, når et andet kort også vinder stikket (T1, T7, T9, T5, T10, H1 og H2). Alle tests er grønne: pytest 256 bestod og 1 sprunget over; appens `npm test` 56 (appen er ikke rørt).

#### 13. Udgivet og tjekket live (14. november 2026)

- **Fletning:** `maerker` er squash-flettet til `main` som ét commit (`50244bd`), så `api/dump.txt` ikke står i historikken på `main`, og pushet sammen med tagget `v-foer-maerker`. Grenen `maerker` ligger stadig på GitHub med sin egen historik (og dermed `dump.txt`, en konstrueret stilling uden navne); den kan slettes.
- **GitHub Actions på `main`:** testene i `api/` er grønne på Linux, og appen er bygget og udgivet igen uden ændringer.
- **Udrulning:** funktionen er udrullet med zip og fjernbygning som i README; `analyse` og `slet_ip_vinduer` er på plads. Ingen nye Azure-ressourcer eller app-indstillinger.
- **Live, 452 (par 1) og 450 (hold 2-NS):** alle 48 spil er beregnet (`beregnet: true`), og svarene har de tre mærker fra tabellen i afsnit 7:

| Turnering | Spil | Kontrakt | Mærke | Mod | Stik | Kort | Med | Uden |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 452 | 3 | 2NT i Nord | skvis | V | 9 | ♦E (farver ♠♥) | 10 | 9 |
| 452 | 18 | 3NT i Syd | indspil | Ø | 9 | ♥B | 10 | 9 |
| 450 | 9 | 2♠ i Vest (udspillet antaget) | indspil | N | 11 | ♥7 | 10 | 9 |

  Fordelingen af nøglebeslutninger live er den samme som lokalt (spilføring 21, 15, 4 og 8; modspil 37, 8, 2 og 1), så linjen er den samme på Linux og Windows.
- **Uændret svar i øvrigt:** svarene blev gemt lige før udrulningen og sammenlignet med svarene efter. Alle felter fra før (turnering, deltager, resultat, faktorer og hvert spil uden de fire nye felter) er ens for begge aftener.
- **Svartid:** 5,8 og 6,5 s før udrulningen; 6,0 og 7,9 s lige efter (teknikken regnet for første gang); 7,1 s for 452 med teknikken i cachen. Tiden går til at hente siderne fra bridge.dk og til instansens start, ikke til teknikken.
- **Appen er uændret:** `index.html` og de to filer i `assets/` har samme indhold som før udrulningen. I Chrome uden vindue mod www.kontraktbridge.dk/postmortem/ viser aftenens oversigt og alle analysevinduer (32 + 16) præcis samme tekst med svaret før og efter udrulningen. Fra startskærmen fører linket til 452 til aftenens oversigt; svaret i `sessionStorage` har de nye felter, og browseren melder ingen fejl.

Del B (appen) kommer i en ny besked.

### Del B (Claude Code, Fable 5.2, 14. november 2026)

Bygget på grenen `raad` (før: `v-foer-raad`). Ikke flettet; funktionen er ikke ændret, og intet er udrullet. Grenen `maerker` er slettet lokalt og på GitHub.

#### 14. Franks to afgørelser

- **Navnet:** mærket hedder "Indspil muligt", filteret "Indspil · n", og kortet på oversigten skriver "Indspil". Forklaringen bruger ordbogens ord: "Et indspil er en form for slutspil: …" og "En skvis er en form for slutspil: …". Linkene går til ordbogens Skvis, Indspil og Slutspil (`/ordbog/#skvis`, `#indspil` og `#slutspil`): et mærke får sit eget opslag og Slutspil.
- **Modspil:** var parret i modspil, hedder mærkerne "Skvis mulig mod jer" og "Indspil muligt mod jer" i spillisten og i analysevinduet, overskriften i mærket er "Indspil mod jer (Nord)", og "Råd til modspillet" står før "Råd til spilføringen".
- **Skviskortet og indspilskortet** står altid i mærket fra `teknik`, også når de ikke er nøglebeslutninger: "Skviskortet er ♦E i stik 9, spillet fra Syd. Vest kan ikke bekende og har ♠ og ♥ tilbage." og "Indspilskortet er ♥B i stik 9, spillet fra Nord. Øst vinder stikket og skal spille ud."

#### 15. Det, appen viser

- **Aftenens oversigt:** kortet "Teknikker i aftenens spil" står mellem faktorerne og spillene med Skvis og Indspil og antal spil, og linjen "Taget ved jeres bord: x af y". `y` er de spil med et mærke, hvor parret var spilfører, og `x` dem, hvor de tog mindst stikkene med teknikken; et spil med begge mærker tæller én gang. Linjen står der ikke, når `y` er 0 (450: holdet var i modspil i spillet med mærket). Uden mærker siger kortet "Ingen af aftenens spil krævede en skvis eller et indspil i de sidste seks stik." Filtrene står i rækkefølgen Alle, Skvis, Indspil, Tabte point; et filter med 0 spil kan ikke vælges. Spillisten viser teknikmærket før mærket fra vindue 1c.
- **Råd til spilføringen:** mærket med stik i overskriften ("Skvis mulig · stik 9"), og for hvert mærke: hvem det er mod, "Uden skvisen 9 stik, med 10.", kortet, stillingen før stikket som et lille bord (de kort, der er tilbage, og hvem der spiller ud), og boksen "Sådan spotter du den" med en fast tekst pr. teknik (skvis, dobbeltskvis, indspil, kast-ind-skvis). Derefter nøglebeslutningerne: stik, kort og hånd ("♣5 fra Syd (bordet) holder 10 stik."), og hvad de to dyreste alternativer giver ("♣DB giver 9 stik."). Et kort, der hører til et mærke, har en lille etiket (skviskortet, indspilskortet, tællingen rettes).
- **Råd til modspillet:** udspillets pris ("♣8 fra Øst koster 2 stik: spilfører har 10 stik efter udspillet og 8 efter det bedste.") eller "er blandt de bedste udspil", de bedste udspil med kort i følge samlet ("♠EK, ♥2, …"), modspillets nøglebeslutninger ("… holder spilfører på 9 stik."), og ved et mærke: "Skvisen er mod Vest. Det bedste modspil kan ikke forhindre den."
- **Udspil, der står forkert:** "Udspillet står forkert på bridge.dk; analysen bruger det bedste udspil (♣3)."
- **Uden indhold vises intet:** et spil uden mærker og uden nøglebeslutninger for spilfører har ikke afsnittet om spilføringen (det gælder 13 af 32 spil i 452 og 8 af 16 i 450); et spil, der ikke er spillet eller er passet ud, har ingen råd; kunne teknikken ikke regnes (tid eller fejl), står der én linje: "Rådene kunne ikke regnes for dette spil."
- **Guiden og noten:** startskærmen har kortet "Sådan læses rådene" med fem punkter (den bedste linje og ikke det spillede; åbne kort, og at en kipning kan være lige så god ved bordet; de sidste seks stik og den manglende indgang; én af flere rigtige linjer; forkert udspil). Noten under analysevinduet siger det samme i to sætninger.

#### 16. Valg undervejs

- **Teksterne skrives i appen** ud fra felterne og står alle i `src/tekster.ts` i beskrivende form. Mockuppens "Afgiv det stik, du alligevel taber, …" er bydeform og er skrevet om. Mockuppens forklaringer pr. stik ("Klørstikket skal afgives alligevel …") kan appen ikke skrive: funktionen sender kort og tal, ikke grunde.
- **Fagordstesten:** "indspil" stod på listen over ord, appen ikke måtte bruge (fra vindue 1c, hvor mærket skulle hedde slutspil). Ordet er taget af listen, fordi appen nu bruger det om netop den særlige form for slutspil, og testens eksempel er rettet. Overbegrebet hedder stadig slutspil.
- **Kortet på oversigten** har tal, ikke knapper: filtrene lige under gør det samme, og to sæt knapper til samme valg er sværere at bruge med tastatur og skærmlæser. Mockuppens fire andre teknikker (eliminering, sikkerhedsspil, dyk og hold-up, trumfkup) og feltet "I modspil: holdt DD" er ikke med; de er ikke i vindue 1b.
- **Det lille bord** er sin egen komponent (`src/ui/Slutstilling.tsx`); det store bord er ikke rørt. På brede skærme holdes hænderne tæt på kompasset, og den, der spiller ud, er fremhævet.
- **Et svar fra før vindue 1b** (det kan ligge i `sessionStorage` i en åben fane) vises som før: uden kort, filtre, mærker og råd.
- **Ordbogens links** er absolutte stier som sidefodens (`/ordbog/#indspil`).

#### 17. Tests

- **Accepttestene blev skrevet og committet røde først** (`741d0dc`): `src/test/teknik.test.tsx` (oversigten: kortet, filtrene, mærkerne, et gammelt svar) og `src/test/raad.test.tsx` (de tre spil med mærker, kortene i mærket, stillingen, ordbogens links, nøglebeslutningerne, udspillet, kast-ind-skvis og dobbeltskvis, ingen tomme afsnit på nogen af de 48 spil, guiden og noten, tilgængelighed).
- **Testsvarene** i `src/test/data/` er lavet igen med funktionen og har de nye felter. En ny test i `api/tests/test_teknik_svar.py` holder dem lig funktionens svar, og testen af de uændrede faktorer sammenligner nu uden `teknikker` på begge sider.
- **Rettet i eksisterende tests:** kun eksemplet med "indspil" i `sprog.test.tsx` og hjælperen `ikkeSpillet` i `hjaelp.tsx` (de nye felter). Testene fra vindue 1c er ellers urørte og grønne; sprogtestene læser nu også de nye tekster på alle skærme.
- **Bredde:** `tools/tjek_bredde.mjs` tjekker de nye dele på alle 48 spil ved 320, 390 og 1280 px (ingen vandret rulning, 44 px trykflader, intet oven i det lille kompas) og filteret Indspil på oversigten.
- **I alt:** `npm test` 92 grønne (før 56); pytest 258 grønne og 1 sprunget over; breddetjekket uden fejl.

#### 18. Skærmbilleder

Ligger i `C:\Users\frank\Kontraktbridge\skaermbilleder\raad\` (ikke i git): `390-452-spil-3.png`, `1280-452-spil-3.png`, `390-452-spil-18.png`, `1280-452-spil-18.png`, `390-450-spil-9.png` og `1280-450-spil-9.png`, og desuden oversigten for begge aftener og startskærmen ved begge bredder.

#### 19. Åbent

- Teksterne i "Sådan spotter du den" og i kortet "Sådan læses rådene" er mine; Frank bør læse dem.
- I 450 spil 9 er listen over de bedste udspil lang (ni muligheder), fordi udspillet er ukendt og næsten alle udspil er lige gode. Den kan kortes til fx de tre første, hvis det ønskes.
- Var parret i modspil, viser "Råd til spilføringen" spilførers (modpartens) nøglebeslutninger. Det følger specen, men afsnittet kunne hedde noget andet dér.

#### 20. Franks godkendelse med tre rettelser (14. november 2026)

- **Bedste udspil:** højst fire vises, derefter "og n andre" (og "og 1 andet", når der er fem). 450 spil 9: "Bedste udspil: ♠EK, ♥2, ♥E, ♦3 og 5 andre."
- **Afsnittets navn i modspil:** var parret i modspil, hedder afsnittet "Spilførerens spil (modparten)" i stedet for "Råd til spilføringen". Det løser det tredje punkt under Åbent i afsnit 19; det andet (den lange liste) er løst af den første rettelse.
- **Forkert udspil i "Ved jeres bord":** flisen viser "♥10*", og "*Udspillet står forkert på bridge.dk" står på en linje under fliserne. Kompasset og DD-feltet er uændrede. Testen fra vindue 1c af flisen er rettet til den nye visning.

Tests efter rettelserne: `npm test` 94 grønne, pytest 258 grønne og 1 sprunget over, breddetjekket uden fejl ved 320, 390 og 1280 px. Skærmbillederne i `skaermbilleder/raad/` er taget igen.

## Besked til Claude Code (del A)

> Model: Fable 5.2, høj effort. Læs `docs/specs/SPEC-postmortem-1b-maerker.md`, `PLAN-postmortem.md`, `NOTAT-afproevning.md` og `api/SVAR.md`. Byg kun del A på grenen `maerker` (tag `v-foer-maerker`). Lad først DDS bekræfte slutstillingerne i specen, og skriv afvigelser i Afklaret. Skriv accepttestene, før du skriver løseren. Mål ydeevnen, før du bygger videre på den. Stop før merge med tabellen over mærker på de 48 spil i Afklaret. Rør ikke appen, og udrul intet.
