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

**Status (17. november 2026): stoppet ved testdataene.** Aftenen 16. november 2026 kunne ikke findes på resultater.bridge.dk ud fra koden og bridge.dk uden at gætte. Der er ingen accepttest og intet bygget endnu.

- **Tag og gren:** `main` (`285aef4`, lig med `origin/main`) er tagget `v-foer-point-som-bridgedk`, og grenen er `point-som-bridgedk`. Specen er committet som `719cf59`. Intet er pushet.
- **Søgningen:** Post Mortem får hele linket fra brugeren og søger ikke selv. Testsiderne fra v1 kommer fra hovedklub 2151, klub 1 (onsdag), og den har ikke aftenen. Gennemgået med samme slags adresser, som siderne selv linker til:
  - turneringsoversigten (`overview.php?mainclubno=…&club=1`) for 280 hovedklubber: de 224 klubnumre på DBf's regionale klublister og resten af numrene 2100–2199;
  - klub 2–12, 20 og 99 under hovedklub 2151 (alle tomme);
  - turneringssiden (`turnering.php`) for alle 145 turneringer, der omfatter 16. november 2026.
- **Resultat:** ingen turnering hedder "Efterårs Hold og Par", og ingen har en sektion "Par Gul". Den nærmeste er en mandagsturnering med hold og sideløbende par, der har "B - Gul række", men den række er en holdrække. Klubber, der ikke er klub 1 under deres hovedklub, eller som ikke står på DBf's lister, er ikke gennemgået, fordi det kræver gæt på numre.
- **Mangler fra Frank:** linket til det personlige regnskab for par 1 i sektion Par Gul 16. november 2026, som det står i adresselinjen (`https://resultater.bridge.dk/template/personligt_regnskab.php?filename=…&tournament=…&section=…&pairno=1`). Med det hentes siderne til en midlertidig mappe, og arbejdet fortsætter fra trin 2 på grenen.
- **Regnskabet:** det personlige regnskab har kolonnerne Point og Pct for NS og ØV med én decimal pr. spil (set i den anonymiserede side for 452). bridge.dk's point pr. spil kan altså læses derfra, når siden er fundet.
- **Rigtige sider:** den midlertidige mappe med de hentede oversigter og turneringssider er slettet. Ingen side fra bridge.dk er kommet i repoet, og `SYSTEM.md` er ikke ændret, fordi intet er bygget.
- **Tokenforbrug** (denne session, 49 svar, målt før den sidste commit): nye input 100, skrevet til cachen 144.974, læst fra cachen 5.395.383 og output 28.310, i alt 5.568.767.

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
