# SPEC – Post Mortem v2a: spil værd at se på, meldesamtalen, udskrift og mail

17. november 2026 · repo `Postmortem` · gren `vaerd-at-se-paa`, tag før: `v-foer-vaerd-at-se-paa`. Planen er `docs/specs/PLAN-postmortem-v2.md`.

## Formål

Post Mortem skal finde de spil, der er værd at tale om efter en aften, og svare på meldesamtalens tre spørgsmål med facit:
- Havde vi en fit?
- Havde vi udgang?
- Havde vi slem?

Aftenen skal kunne udskrives og sendes til makker med plads til kommentarer. Grundlaget er Franks tjekliste til post mortem. **v2a gemmer intet nyt:** alt regnes af de data, appen allerede har. Spilnotater og "Gem aftenen" kommer i v2b.

## Mock-up (godkendt af Frank 17. nov.)

Mock-up'en ligger på designlærredet "Post Mortem v2a – mockup", og der er kopier i `docs/specs/design/v2a/`:

| Skærm | Fil | Bygges i |
| --- | --- | --- |
| 1 · Aftenen: Spil værd at se på | `1-aften-vaerd-at-se-paa.html` | v2a |
| 2 · Analysevinduet: meldesamtalen | `2-meldesamtalen.html` | v2a |
| 3 · Send med mail, kopiér som tekst | `3-mail.html` | v2a |
| 4 · Udskrift, A4 | `4-udskrift-a4.html` | v2a |
| 5 · Spilnotat | `5-notat-v2b.html` | **v2b, ikke nu** |
| 6 · Aftenens læring | `6-laering-v2b.html` | **v2b, ikke nu** |

- Skærm 5 og 6 er kun med, så v2a bygges, så den passer til dem. Statusfelterne for fit, udgang og slem skal være én komponent, som notatet og udskriften kan genbruge.
- Hænderne og svarene i spil 1 på lærredet er eksempeldata. Kontrakter, procenter og mærker er fra den rigtige aften.

**Testaften:** 16. november 2026, par 1, Par Gul:
`https://resultater.bridge.dk/template/personligt_regnskab.php?filename=1111/MT3287GT11912.XML&tournament=3287&section=7&pairno=1`
Den er allerede gemt anonymiseret som testdata i 1d. Brug den gemte kopi.

## Afgrænsning

| Må ændres | Må ikke ændres |
| --- | --- |
| `api/postmortem/`: nye felter i svaret (mærker, meldesamtale, sortering) og `SVAR.md` | dobbeltdummy, faktorerne, point og procent (1d), mærkerne Skvis og Indspil, cache og IP-grænse |
| `src/`: aftenens side (liste og knapper), analysevinduet (kortet Meldesamtalen), udskrift og mail, `src/tekster.ts` | "Hvor gik pointene?", Teknikker og Spillene, ud over filteret "Værd at se på" |
| tests og anonymiserede testdata | ingen lagring i browseren (det kommer i v2b), ingen navne |

## 1. Spil værd at se på

Et spil er med, når det har mindst ét mærke:

| Mærke | Regel |
| --- | --- |
| **Bund** / **Top** | procent under 25 eller over 75 |
| **Anden kontrakt end feltet** | jeres kontrakt (niveau, farve og side) er en anden end den hyppigste i feltet |
| **Udgang misset** / **Slem misset** | meldesamtalen siger "Ja" eller "Måske" til udgang eller slem, og I meldte lavere |
| **Udgang meldt uden dækning** / **Slem meldt uden dækning** | I meldte udgang eller slem, og meldesamtalen siger "Nej" |
| **Strafdobling** | kontrakten er doblet eller redoblet |
| **Udspillet kostede N stik** | udspillets pris fra v1 er mindst 1 stik, og jeres side spillede ud |
| **Spilføring −N stik** / **Modspil −N stik** | faktoren fra v1 er negativ |
| **Heldigt** | mindst 50 %, men jeres egne faktorer (meldinger, spilføring, modspil) er tilsammen negative |
| **Uheldigt** | under 50 %, jeres egne faktorer er 0, og Held og uheld er negativ |

- **Sortering:** efter summen af jeres egne faktorer, det dyreste først. Ved lighed kommer laveste procent først. Heldige og uheldige spil står sidst.
- **Visning:** de første 8 vises, og derunder står knappen "Vis alle (N)". Filteret "Værd at se på · N" kommer med i filtrene over Spillene.
- **Forklaring:** "Hvorfor er et spil med?" kan foldes ud og har reglerne i ord, som på skærm 1.

## 2. Meldesamtalen (analysevinduet, øverst)

Tre statusfelter: **FIT**, **UDGANG** og **SLEM**. Hvert felt har et symbol og et ord (✓ JA, ~ MÅSKE, ✗ NEJ) og en kort grund. Farven må ikke være det eneste, der viser svaret.

**Reglerne, alle for jeres side:**
- **Fit:** "Ja", når I har 8 eller flere kort i en farve. Ellers "Nej". Grunden er farven og fordelingen, fx "8 spar (5–3)".
- **Udgang og slem**, ud fra dobbeltdummy for jeres side i den bedste kontrakt på niveauet:
  - **Ja:** kontrakten vinder med åbne kort, og mindst halvdelen af feltet spillede på det niveau eller højere.
  - **Måske:** kontrakten vinder med åbne kort, men under halvdelen af feltet var der.
  - **Nej:** den går ned med åbne kort.
- **Slem** vises kun, når udgang er "Ja" eller "Måske". Ellers står "–".
- **Grunden** nævner stik med åbne kort og feltet, fx "12 stik i sans og spar; 2 af 7 borde".
- **Måske og nej** foldes ud med **"Spørg hinanden"**. Spørgsmålene står i en fast liste i `src/tekster.ts` pr. felt og svar og er hentet fra tjeklistens punkt 2–3:
  - **Fit, nej eller måske:** Undersøgte vi majorfarverne? Viste vi vores længder? Stoppede vi i 3NT før en mulig majorfit?
  - **Udgang, måske:** Inviterede vi, da vi skulle? Passede en af os for tidligt?
  - **Udgang, meldt uden dækning:** Meldte vi udgang uden nok information?
  - **Slem, måske:** Undersøgte vi slem? Havde vi styr på esser og nøglekort? Var 6NT eller slem i farve rigtigst ved parturnering?
  - **Slem, meldt uden dækning:** Pressede vi for hårdt? Havde vi kontrol i sidefarverne?
- **Ja-felterne er foldet sammen.**
- **Under felterne** står to linjer:
  - **Var overstikket afgørende?** "Ja", når ét stik mere eller mindre havde flyttet jeres point med mindst 25 procentpoint. Ellers "Nej".
  - **Hvem ejede spillet?** Uden konkurrence står "I" eller "Modparten". Med konkurrence (begge sider har meldt en farve) står parrets side efter dobbeltdummy, trumftallet for hver side og summen (loven om totale stik), og "Bedst for jer: spil selv / forsvar mod X".
- **Ved holdturnering** gælder det samme, men feltet er det andet bord, så "halvdelen af feltet" bliver "det andet bord".

## 3. Udskrift

- Knappen **Udskriv** åbner browserens print. Brugeren vælger "Spil værd at se på" eller "Alle spil".
- **Side 1:** aftenens resultat, "Hvor gik pointene?" og listen over de valgte spil.
- **Derefter én side pr. spil** (skærm 4):
  - de fire hænder, kontrakt, udspil og resultat;
  - feltet og faktorerne;
  - meldesamtalens tre felter og "Spørg hinanden";
  - en ramme med afkrydsning for **beslutning eller resultat** og **aftalestatus** og en linje til **primær årsag**;
  - et fremhævet felt **"Næste gang gør vi … / ny aftale"** med linjer;
  - **Kommentarer** med linjer resten af siden.
- **Print-CSS:**
  - `@page { size: A4; margin: 12mm }`.
  - Hvert spil begynder på en ny side.
  - `break-inside: avoid` på hvert spils kort, så rammen med beslutning, årsag og ny aftale aldrig deles over to sider.
  - Menu, sidefod og knapper skjules.
  - Kun ♥ og ♦ som symboler er røde, og alt andet er sort.

## 4. Mail og kopiér som tekst

- Knappen **Mail** fører til et lille vindue (skærm 3), hvor brugeren vælger "Spil værd at se på" eller "Alle spil".
  1. **"Kopiér gennemgangen"** lægger den fulde tekst i udklipsholderen.
  2. **"Åbn mail, og sæt ind"** åbner `mailto:` med emnet "Post Mortem: <dato>, <procent>" og en kort tekst om at sætte ind.
- **På mobil** bruges `navigator.share` med hele teksten, hvor den findes.
- **Teksten** er ren tekst som på skærm 3:
  - aftenen og resultatet;
  - faktorerne;
  - pr. spil kontrakt, resultat, procent, mærker og meldesamtalen kort;
  - en linje **"Kommentar:"** med to tomme linjer efter;
  - til sidst adressen www.kontraktbridge.dk/postmortem/.
- **Ingen navne,** kun "I" og "modparten".

## Accepttest (skrives først, røde)

1. **Mærkerne for 16. nov.:**
   - Spil 1 har "Slem misset" og "Anden kontrakt end feltet".
   - Spil 7 har "Bund" og "Spilføring −1 stik".
   - Spil 17 har "Strafdobling".
   - Spil 19 er "Heldigt".
   - Spil 15 er "Uheldigt".
   - Rækkefølgen følger reglen. Testen skriver hele listen i Afklaret, så Frank kan se den.
2. **Meldesamtalen:**
   - Fit, udgang og slem for spil 1 og spil 17 og mindst fire konstruerede spil, der dækker ja, måske og nej, fit "Nej" og konkurrence med trumftallet.
   - Facit for udgang og slem holdes op mod DD-tabellen og feltet i testdata.
3. **"Spørg hinanden"** vises kun ved måske, nej og meldt uden dækning, og teksterne findes kun i `src/tekster.ts`.
4. **Udskrift** (Chrome headless, A4):
   - én side pr. spil plus side 1;
   - ingen ramme med beslutning, årsag og ny aftale er delt over to sider;
   - menu og knapper er skjult;
   - kun ♥ og ♦ som symboler er røde.
5. **Mail-teksten** for de spil, der er værd at se på, på 16. nov. svarer til en gemt reference. Den indeholder "Kommentar:" pr. spil og ingen navne, og navnetesten består.
6. **Bredde:** ingen vandret scroll ved 320, 390 og 1280 px. Knapperne er mindst 44 px, og alt virker med tastatur og skærmlæser.
7. **Uændret:** point, procent, faktorer, DD og mærker er som før, og alle eksisterende tests består.

## Afklaret

(udfyldes af Claude Code. Tokenforbruget skrives i fire tal: nye input, skrevet til cachen, læst fra cachen og output.)

**Til Franks bekræftelse ved gennemgangen:**
- grænserne for bund og top (25 % og 75 %);
- reglen for ja, måske og nej (halvdelen af feltet);
- grænsen på 25 procentpoint for "overstikket var afgørende".

### Første session (17. november 2026, stoppet før accepttestene)

- **Status:** stoppet før accepttestene med spørgsmål til Frank, fordi specen ikke kan bygges, som den står, på to punkter (1 og 2 nedenfor). Intet er bygget, og kun specen og mock-up'en er committet. Intet er pushet eller udrullet. **Venter på Franks svar; ikke flettet.**
- **Tag og gren:** `main` (`d973315`, lig med `origin/main`) er tagget `v-foer-vaerd-at-se-paa`, og grenen er `vaerd-at-se-paa`. Specen og de seks mock-up-filer er committet som `f91d9e1`. `PLAN-postmortem-v2.md` er ikke rørt.
- **Sådan er reglerne prøvet:** reglerne i afsnit 1 og 2 er regnet med et script uden for repoet på de gemte sider for 16. november (kontrakterne i feltet fra `spilresultater-3287.html`) og funktionens svar i `src/test/data/par-3287.json` (procent, faktorer, DD-tabel og udspil). Feltet er de 7 andre borde, som i mock-up'en ("2 af 7 borde").

**Det, der stopper bygningen:**

1. **Reglen for Heldigt og accepttest 1 modsiger hinanden i spil 19.** Accepttesten kræver, at spil 19 er "Heldigt", og reglen er "mindst 50 %, men jeres egne faktorer (meldinger, spilføring, modspil) er tilsammen negative". Spil 19 (Ø 3♦, 11 stik, −150, 85,7 %) har meldinger +11, spilføring 0 og modspil −1, altså tilsammen +10. Meldinger er +11, fordi modparten stoppede i 3♦, mens par er 6NT for Øst–Vest. Modspil −1 er udspillet, der kostede et stik (12 stik før udspillet og 13 efter). Efter reglen er spil 19 altså ikke heldigt. Tre muligheder:
   - (a) Kun den negative del af hver af jeres egne faktorer tæller. En positiv faktor for meldinger kommer af modpartens meldinger, ligesom v1 lægger modpartens fejl i spilføring og modspil under held og uheld. Heldige: 4, 5, 11, 13, 18, 19, 21 og 22. Uheldige: 15, 20, 26 og 27. **Anbefalet.**
   - (b) Meldinger tæller kun som jeres egen faktor, når I var spilfører, eller alle passede. Heldige: de samme otte. Uheldige: 15, 26 og 27.
   - (c) Reglen står, og accepttesten rettes. Heldige: 4, 5, 11, 13, 18, 21 og 22. Uheldige: 15 og 26. Spil 19 er så med som Top, Anden kontrakt end feltet og Udspillet kostede 1 stik.

   Sorteringen ("summen af jeres egne faktorer") følger samme valg.
2. **Konkurrence kan ikke læses af data.** "Med konkurrence (begge sider har meldt en farve)" kræver meldeforløbet. bridge.dk's sider (personligt regnskab, kortfordeling, spilresultater og bordresultater) har kun slutkontrakten, udspillet, stikkene og scoren, så det kan ikke ses, om den anden side meldte. Tre muligheder:
   - (a) Konkurrence, når begge sider spillede en farvekontrakt ved mindst ét bord (jeres eller feltets, ved holdturnering de to borde). 16. november giver det 14 af 32 spil: 4, 6, 8, 13, 15, 17, 19, 20, 22, 24, 25, 26, 29 og 32. **Anbefalet.**
   - (b) Konkurrence, når begge sider har et fit på mindst 8 kort. Det er 29 af 32 spil, så det skiller næsten ikke.
   - (c) Linjen skelner ikke: den viser altid parrets side efter dobbeltdummy, trumftallet for hver side og summen.

**Til Frank, før der bygges (ingen modstrid, men det ændrer billedet):**

3. **Listen bliver lang.** Med reglerne, som de står, har 29 af 32 spil mindst ét mærke, mens mock-up'en viser 8 af 32. Kun spil 3, 10 og 31 er uden.
   - Bund og top giver alene 14 spil: med 7 andre borde går procenten i trin på 7,1, og 4 af de 15 mulige værdier ligger under 25 % og 4 over 75 %.
   - "Anden kontrakt end feltet" rammer 20 spil, også delkontrakter, hvor kun niveauet afviger (fx 2♠ mod feltets 3♠).
   - "Vis alle (N)" viser de 8 dyreste først, så listen kan bruges, men "29 af 32" siger ikke meget. Med (a) under punkt 1 bliver rækkefølgen 1, 8, 25, 29, 6, 24, 9, 14, 32, 17, 7, 12, 28, 30, 2, 16 og 23, så de heldige 4, 5, 21, 11, 13, 18, 22 og 19 og til sidst de uheldige 15, 20, 26 og 27. Spil 7 (0 %) er nummer 11, fordi spilføringen kun kostede 1 point.
4. **Mock-up'en og specen siger noget forskelligt om ja, måske og nej.** Boksen "Sådan regnes ja, nej og måske" på skærm 2 siger "kræver ingen god sidning" og "kun med en god sidning". Det har specens regel ikke, og dobbeltdummy kan ikke afgøre det. Det samme gælder facit-teksten om ♥D hos Øst ("slemmen er en kipning"). Mail-teksten på skærm 3 siger "Slem: ja … 2 af 7 borde", hvor skærm 2 og reglen siger måske. Forslag: boksen og teksterne følger specens regel (stik med åbne kort og feltet).

**Valg, specen ikke afgør** (forslaget i parentes, så næste session ikke behøver at stoppe igen):

5. **Holdturnering:** der er ingen procent pr. spil, så bund og top, grænsen på 50 % for heldigt og uheldigt og de 25 procentpoint for overstikket siger ikke noget i imp. (Bund og top udelades. Heldigt ved 0 imp eller mere og uheldigt under 0. Overstikket er afgørende ved mindst 3 imp.)
6. **Udgang eller slem misset, når modparten fik kontrakten:** om I "meldte lavere", kan ikke ses, fx ved en offermelding over jeres 4♠. (Mærket gives kun, når I var spilfører, eller alle passede. Det ændrer intet 16. november.)
7. **Anden kontrakt end feltet ved lighed:** i spil 17 spillede to borde 4♣ og to 5♣. (Intet mærke, når jeres kontrakt er blandt de hyppigste. Mock-up'en viser mærket på spil 17.)
8. **Modspil −N stik, når faktoren kun er negativ på grund af udspillet** (spil 14, 19 og 22). (Kun "Udspillet kostede N stik", som mock-up'en viser spil 14. "Modspil −N stik" tæller stikkene efter udspillet.)
9. **Nej uden spørgsmål:** "Udgang: nej" og "Slem: nej", når I ikke meldte det, har ingen spørgsmål på listen. (Foldet sammen som ja, så "Slem: nej" ikke står åbent på næsten hvert spil.)
10. **Heldigt og Uheldigt** vises som ét mærke med grunden, som i mock-up'en ("Heldigt: godt resultat, udspil −1 stik", "Uheldigt: bund, bedste modspil"), og spillets andre mærker står i grunden.
11. **Husets ord:** appens spørgsmål bliver "Havde vi et fit?" (specen skriver "en fit"), fordi fagordstesten fejler ved "en fit".

- **Spørgsmål til Frank:** punkt 1 og 2 skal besvares, før der bygges. Punkt 3 og 4 og forslagene under 5–11 kan besvares samtidig.
- **`SYSTEM.md`:** beslutningsloggen har en række for 17. nov. 2026 om Post Mortem 2a med stoppet, de to punkter, grenen og tagget og "Venter på Franks svar; ikke flettet". Datoen øverst var allerede 17. november 2026.
- **Tokenforbrug** (første session, 33 svar, målt før den sidste commit): nye input 66, skrevet til cachen 196.909, læst fra cachen 4.221.371 og output 63.877, i alt 4.482.223.

## Arbejdsgang

1. Arbejd i en frisk session, og kør alt i forgrunden.
2. Opret tagget og grenen.
3. Mock-up'ens seks filer ligger allerede i `docs/specs/design/v2a/`. Commit dem på grenen.
4. Skriv accepttestene, så de er røde, og byg derefter.
5. Stop før merge. Send skærmbilleder af skærm 1–3 ved 390 og 1280 px og en PDF af udskriften for spil 1 og 7.
