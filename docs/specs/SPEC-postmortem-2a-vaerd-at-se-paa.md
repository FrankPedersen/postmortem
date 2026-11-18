# SPEC – Post Mortem v2a: spil værd at se på, meldesamtalen, udskrift og mail

17. november 2026 · repo `Postmortem` · gren `vaerd-at-se-paa`, tag før: `v-foer-vaerd-at-se-paa`. Planen er `docs/specs/PLAN-postmortem-v2.md`.

## Formål

Post Mortem skal finde de spil, der er værd at tale om efter en aften, og svare på meldesamtalens tre spørgsmål med facit:
- Havde vi et fit?
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
- **Det, der ikke bruges (Franks svar 17. nov.):** mock-up'ens tekster om sidning og kipning bruges ikke: boksen "Sådan regnes ja, nej og måske" og facit-teksten om ♥D på skærm 2 og "kipning, 2 af 7" på skærm 4. Ja, måske og nej følger reglen i afsnit 2 (stik med åbne kort og feltet), og mail-teksten siger "måske", hvor reglen giver det (skærm 3 skriver "Slem: ja … 2 af 7 borde"). Listen på skærm 1 følger reglen i afsnit 1, ikke mock-up'ens udvalg.

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

**Jeres egne faktorer** er meldinger, spilføring og modspil fra v1. Kun den negative del af hver faktor tæller (Franks svar 17. nov., punkt 1 (a)): en positiv faktor for meldinger kommer af modpartens meldinger, ligesom v1 lægger modpartens fejl i spilføring og modspil under held og uheld. "Den negative del af egne faktorer" er summen af de negative faktorer, fx −1 for meldinger +11, spilføring 0 og modspil −1. Den kaldes også spillets **omkostning**.

**Listen er rangeret, ikke en grænse** (Franks svar 2, 17. nov.):
- **"Spil værd at se på"** viser de 8 spil med størst omkostning, med deres mærker. Er der færre end 8 spil med en omkostning (en negativ del under 0), vises færre.
- **"Vis alle (N)"** viser derudover resten af de spil, der har en omkostning på −2 point eller lavere (ved holdturnering −2 imp), eller som har et af de faste mærker. N er alle spil på den lange liste, de 8 og resten. Knappen står kun, når der er en rest.
- **De uheldige spil** (Uheldigt: ingen egne fejl) står på én linje under listen, fx "Uheldige, ingen fejl: spil 15, 20, 26 og 27". De står hverken blandt de 8 eller i resten.
- **De faste mærker** er dem, der alene bringer et spil med under "Vis alle": udgang eller slem misset eller meldt uden dækning, strafdobling, udspillet kostede N stik og heldigt.
- **Ekstra mærker** er bund, top og anden kontrakt end feltet: de vises på spillet, men bringer det ikke med. Meldinger, spilføring og modspil viser, hvor omkostningen kom fra, og bringer kun et spil med gennem omkostningen.

**Mærkerne** gives på alle spil.

| Mærke | Regel | Slags |
| --- | --- | --- |
| **Udgang misset** / **Slem misset** | meldesamtalen siger "Ja" eller "Måske" til udgang eller slem, og I meldte lavere. Mærket gives kun, når I var spilfører, eller alle passede (forslag 6) | fast |
| **Udgang meldt uden dækning** / **Slem meldt uden dækning** | I meldte udgang eller slem, og meldesamtalen siger "Nej" | fast |
| **Strafdobling** | kontrakten er doblet eller redoblet | fast |
| **Udspillet kostede N stik** | udspillets pris fra v1 er mindst 1 stik, og jeres side spillede ud | fast |
| **Heldigt** | mindst 50 %, men den negative del af jeres egne faktorer er under 0 | fast |
| **Uheldigt** | under 50 %, ingen af jeres egne faktorer er negative, og Held og uheld er negativ | linjen under listen |
| **Meldinger −N point** | meldingsfaktoren fra v1 er negativ; N er pointene med én decimal som bridge.dk (ved holdturnering "Meldinger −N imp") (Franks svar 2) | omkostning |
| **Spilføring −N stik** / **Modspil −N stik** | faktoren fra v1 er negativ. N er stikkene efter udspillet: er modspillet kun negativt på grund af udspillet, står kun "Udspillet kostede N stik" (forslag 8) | omkostning |
| **Bund** / **Top** | procent under 25 eller over 75 | ekstra |
| **Anden kontrakt end feltet** | jeres kontrakt har en anden farve (sans regnes som en farve) eller er en anden slags kontrakt (delkontrakt, udgang eller slem; pas er sin egen slags) end den hyppigste i feltet, eller den anden side var spilfører (Franks svar 2). Et andet niveau af samme slags i samme farve og ved samme side tæller ikke, fx 2♠ mod feltets 3♠. Er jeres kontrakt blandt de hyppigste ved lighed, er der intet mærke (forslag 7) | ekstra |

- **Heldigt og Uheldigt** vises som ét mærke med grunden, fx "Heldigt: godt resultat, udspillet kostede 1 stik" og "Uheldigt: bund, ingen fejl"; spillets andre mærker står i grunden (forslag 10).
- **Sortering:** efter omkostningen, det dyreste først, både blandt de 8 og i resten. Heldige spil står efter omkostningen som de andre. Ved lighed kommer laveste procent først (ved holdturnering laveste imp) og derefter laveste spilnummer.
- **Visning:** de 8 vises med "8 af 32", og derunder står knappen "Vis alle (N)" og linjen med de uheldige. Filteret "Værd at se på · 8" over Spillene viser de 8 i spillenes rækkefølge, og udskriften og mailen har de 8 under "Spil værd at se på".
- **Forklaring:** "Hvorfor er et spil med?" kan foldes ud og har listens regel i ord, som på skærm 1, og siger, at bund, top og anden kontrakt end feltet kun er ekstra mærker.
- **Ved holdturnering** (forslag 5 og Franks svar 2): bund og top udelades, grænsen er −2 imp, og meldingsmærket er "Meldinger −N imp". Heldigt er 0 imp eller mere, og uheldigt er under 0 imp.

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
- **Ja-felterne er foldet sammen**, og det samme er "Udgang: nej" og "Slem: nej", når I ikke meldte det, fordi de ikke har spørgsmål (forslag 9).
- **Under felterne** står to linjer:
  - **Var overstikket afgørende?** "Ja", når ét stik mere eller mindre havde flyttet jeres point med mindst 25 procentpoint. Ellers "Nej".
  - **Hvem ejede spillet?** Uden konkurrence står "I" eller "Modparten". Med konkurrence står parrets side efter dobbeltdummy, trumftallet for hver side og summen (loven om totale stik), og "Bedst for jer: spil selv / forsvar mod X". **Konkurrence** er, når begge sider spillede en farvekontrakt ved mindst ét bord, jeres eller feltets; ved holdturnering de to borde (Franks svar 17. nov., punkt 2 (a)). bridge.dk's sider har ikke meldeforløbet, så det kan ikke ses, om den anden side meldte.
- **Ved holdturnering** gælder det samme, men feltet er det andet bord, så "halvdelen af feltet" bliver "det andet bord". Overstikket er afgørende ved mindst 3 imp (forslag 5).

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
  - pr. spil kontrakt, resultat, procent, mærker og meldesamtalen kort, med ja, måske og nej efter reglen i afsnit 2, fx "Slem: måske, 12 stik med åbne kort; 0 af 7 borde" (Franks svar 17. nov.);
  - en linje **"Kommentar:"** med to tomme linjer efter;
  - til sidst adressen www.kontraktbridge.dk/postmortem/.
- **Ingen navne,** kun "I" og "modparten".

## Accepttest (skrives først, røde)

1. **Mærkerne og listen for 16. nov.** (rettet efter Franks svar 2, 17. nov.):
   - "Spil værd at se på" er spil 1, 4, 8, 25, 29, 6, 24 og 9 i den rækkefølge, og "Vis alle (18)" viser derudover 5, 21, 14, 11, 13, 32, 17, 18, 22 og 19. Mærkerne er dem under Afklaret ("Franks svar 2").
   - Linjen under listen er "Uheldige, ingen fejl: spil 15, 20, 26 og 27".
   - Spil 1 har "Slem misset", "Meldinger −14 point" og "Anden kontrakt end feltet" og er nummer 1.
   - Spil 7 har "Bund", "Spilføring −1 stik" og "Anden kontrakt end feltet", men er hverken blandt de 8 eller under "Vis alle": omkostningen er −1 point, og ingen af mærkerne er faste. Udskriften af spil 7 laves fra "Alle spil".
   - Spil 17 har "Strafdobling" og står under "Vis alle".
   - Spil 19 er "Heldigt" (meldinger +11 tæller ikke; modspil −1) og står under "Vis alle".
   - Spil 15 er "Uheldigt" og står på linjen under listen.
   - Spil 12 har ikke "Anden kontrakt end feltet" (2♠ mod feltets 3♠: samme farve, slags og side).
   - Spil 32 har "Meldinger −2,3 point".
   - Ved holdturnering er grænsen −2 imp, og bund og top findes ikke.
   - Testen skriver hele listen, så Frank kan se den.
2. **Meldesamtalen:**
   - Fit, udgang og slem for spil 1 og spil 17 og mindst fire konstruerede spil, der dækker ja, måske og nej, fit "Nej" og konkurrence med trumftallet.
   - Facit for udgang og slem holdes op mod DD-tabellen og feltet i testdata.
3. **"Spørg hinanden"** vises kun ved måske, fit "Nej" og meldt uden dækning, og teksterne findes kun i `src/tekster.ts`. "Udgang: nej" og "Slem: nej" uden spørgsmål er foldet sammen (forslag 9).
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

### Franks svar, 17. nov. 2026

> "Post Mortem 2a, svar fra Frank:
> Heldigt og sortering: (a), kun den negative del af egne faktorer tæller.
> Konkurrence: (a), begge sider spillede en farvekontrakt ved mindst ét bord.
> Listen strammes: et spil er med, når mindst ét gælder: egne faktorer (negativ del) ≤ −2 point, udgang eller slem misset eller meldt uden dækning, strafdobling, udspillet kostede mindst 1 stik, eller heldigt eller uheldigt. Bund, top og anden kontrakt end feltet vises som ekstra mærker, men bringer ikke alene et spil på listen. 'Anden kontrakt end feltet' kun ved anden farve eller anden slags kontrakt (delkontrakt, udgang eller slem). Ret accepttest 1 til reglerne, og skriv antallet og listen for 16. nov. under Afklaret; målet er 8–12 spil.
> Specens regel for ja, måske og nej gælder. Mock-up'ens tekster om sidning og kipning bruges ikke, og mail-teksten skal sige 'måske', hvor reglen giver det.
> Forslagene under 5–11 er godkendt, også 'Havde vi et fit?'.
> Fortsæt i en frisk session på grenen med accepttestene (røde), byg, og stop før merge med billeder og PDF. Kør alt i forgrunden."

### Anden session (17. november 2026, stoppet før accepttestene)

- **Status:** stoppet før accepttestene, fordi listen for 16. november med Franks regler er **22 af 32 spil**, og målet er 8–12. Specens tekst er rettet efter svaret (Formål, Mock-up, afsnit 1, 2 og 4 og accepttest 1 og 3), men intet er bygget, og der er ingen nye tests. Intet er pushet eller udrullet. `PLAN-postmortem-v2.md` er ikke rørt. **Venter på Franks svar; ikke flettet.**
- **Sådan er listen regnet:** med et script uden for repoet på de gemte sider for 16. november (feltets kontrakter i `spilresultater-3287.html`) og funktionens svar i `src/test/data/par-3287.json`, som i første session. Feltet er de 7 andre borde (6 i spil 32). Udgang og slem er regnet efter reglen i afsnit 2, og forslag 6, 7 og 8 er brugt.

**Listen for 16. november med Franks regler (22 spil, i rækkefølge).** "Negativ del" er summen af de negative egne faktorer i point.

| Nr. | Spil | Kontrakt | Procent | Negativ del | Med på grund af | Ekstra mærker |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | N 4♠ | 28,6 | −14 | egne faktorer; slem misset | Anden kontrakt end feltet |
| 2 | 8 | Ø 3♥ | 21,4 | −9 | egne faktorer | Bund, Modspil −2 stik |
| 3 | 25 | Ø 3♠ | 7,1 | −8 | egne faktorer | Bund, Anden kontrakt end feltet, Modspil −1 stik |
| 4 | 29 | N 2♠ | 42,9 | −8 | egne faktorer | Anden kontrakt end feltet, Spilføring −1 stik |
| 5 | 6 | N 3♠ | 42,9 | −7 | egne faktorer; udgang misset | – |
| 6 | 24 | Ø 2♠ | 14,3 | −6 | egne faktorer | Bund, Anden kontrakt end feltet, Modspil −2 stik |
| 7 | 9 | Ø 3NT | 42,9 | −6 | egne faktorer | Modspil −1 stik |
| 8 | 14 | V 4♠ | 28,6 | −5 | egne faktorer; udspillet kostede 1 stik | Anden kontrakt end feltet |
| 9 | 32 | Ø 3♥ | 41,8 | −2,3 | egne faktorer (kun meldinger) | – (intet mærke) |
| 10 | 17 | N 5♣ doblet | 14,3 | −2 | egne faktorer; udgang meldt uden dækning; strafdobling | Bund, Anden kontrakt end feltet |
| 11 | 4 | N 3NT | 71,4 | −10 | egne faktorer; heldigt | Anden kontrakt end feltet |
| 12 | 5 | N 3NT | 57,1 | −6 | egne faktorer; heldigt | Spilføring −1 stik |
| 13 | 21 | N 2♥ | 57,1 | −6 | egne faktorer; udgang misset; heldigt | – |
| 14 | 11 | N 4♠ | 85,7 | −5 | egne faktorer; udgang meldt uden dækning; heldigt | Top |
| 15 | 13 | N 1♥ | 71,4 | −4 | egne faktorer; udgang misset; heldigt | Spilføring −1 stik |
| 16 | 18 | S 1NT | 78,6 | −2 | egne faktorer; udgang misset; heldigt | Top, Anden kontrakt end feltet |
| 17 | 22 | Ø 4♥ | 78,6 | −2 | egne faktorer; udspillet kostede 1 stik; heldigt | Top |
| 18 | 19 | Ø 3♦ | 85,7 | −1 | udspillet kostede 1 stik; heldigt | Top, Anden kontrakt end feltet |
| 19 | 15 | V 3♠ | 0 | 0 | uheldigt | Bund, Anden kontrakt end feltet |
| 20 | 20 | S 2♠ | 14,3 | 0 | uheldigt | Bund, Anden kontrakt end feltet |
| 21 | 26 | V 2♠ | 42,9 | 0 | uheldigt | – |
| 22 | 27 | V 5♠ | 42,9 | 0 | uheldigt | – |

Ikke med (10 spil): 2 (Top, Anden kontrakt end feltet), 3, **7** (Bund, Anden kontrakt end feltet, Spilføring −1 stik; negativ del −1), 10, 12, 16 (Top), 23 (Top, Anden kontrakt end feltet), 28 og 30 (Anden kontrakt end feltet) og 31. Skærmen viser de første 8 (1, 8, 25, 29, 6, 24, 9 og 14) og "Vis alle (22)".

**Det, der gør listen for lang:**
- **Grænsen på −2 point rammer 17 spil** (1, 4, 5, 6, 8, 9, 11, 13, 14, 17, 18, 21, 22, 24, 25, 29 og 32). Med 7 andre borde er toppen 14 point, og hvert bord er 2 point (1 ved lighed), så −2 point er ét bord. 6 spil er kun med af den grund (8, 9, 24, 25, 29 og 32).
- **Mærkerne alene giver 10 spil:** udgang eller slem misset eller meldt uden dækning er 7 spil (1, 6, 11, 13, 17, 18 og 21), strafdobling 1 (17) og udspillet 3 (14, 19 og 22).
- **Heldigt og uheldigt giver 12 spil:** heldigt er 8 af de 17 spil på mindst 50 % (4, 5, 11, 13, 18, 19, 21 og 22), fordi en negativ egen faktor på −1 point er nok. Uheldigt er 4 (15, 20, 26 og 27), og de fire er kun med af den grund.
- **Ingen enkelt grænse retter det:** med −6 point i stedet for −2 falder kun spil 32 ud (21 spil). Uden grænsen for egne faktorer er listen 16, og uden uheldigt 18.

**Varianter, regnet på samme data** (til Franks valg; ingen er bygget):
- (a) **Kun mærkerne, plus uheldigt ved bund:** udgang eller slem misset eller meldt uden dækning, strafdobling, udspillet og uheldigt under 25 %. **12 spil:** 1, 6, 14, 17, 21, 11, 13, 18, 22, 19, 15 og 20. Egne faktorer sorterer stadig, og heldigt vises som ekstra mærke. Spil 1, 15, 17 og 19 fra accepttest 1 er med; spil 4, 5, 8, 9, 24, 25 og 29 (−6 til −10 point) er ikke.
- (b) **Kun egne faktorer på −6 point eller lavere** (tre borde): **10 spil:** 1, 8, 25, 29, 6, 24, 9, 4, 5 og 21. Spil 15, 17 og 19 fra accepttest 1 er ikke med.
- (c) **Reglerne står**, og listen er 22 med de 8 dyreste øverst og "Vis alle (22)".

**Andre fund ved reglerne:**
- **Spil 7 er ikke med:** dets mærker er Bund, Anden kontrakt end feltet og Spilføring −1 stik, og den negative del er −1 point. Accepttest 1 er rettet til det. Mock-up'en har spil 7 som nummer 2, og opgavens PDF af spil 1 og 7 kan laves med udskriften "Alle spil".
- **Spil 32 kommer med uden et mærke:** kun meldinger er negative (−2,3 point, modpartens 3♥ mod feltets 2♥), og der er ikke et mærke for meldinger. Forslag: mærket "Meldinger −N point", når meldingsfaktoren er negativ, som Spilføring og Modspil.
- **Anden kontrakt end feltet** med den nye regel er 16 spil (1, 2, 4, 7, 14, 15, 17, 18, 19, 20, 23, 24, 25, 28, 29 og 30); før var det 20. Siden (hvem der var spilfører) er med i sammenligningen, men det ændrer intet 16. november.
- **Konkurrence** med svaret (a) er 14 af 32 spil, som første session regnede: 4, 6, 8, 13, 15, 17, 19, 20, 22, 24, 25, 26, 29 og 32.
- **Holdturnering:** faktorerne er i imp, så grænsen på −2 point bliver −2 imp. Forslag: −2 imp, med forslag 5 for resten.

**Spørgsmål til Frank:**
1. Hvilken regel skal listen have: (a), (b), (c) eller en anden? Ved (a) og (b) rettes accepttest 1 igen.
2. Er det rigtigt, at spil 7 ikke er med?
3. Skal der være et mærke "Meldinger −N point", så spil som 32 ikke står uden mærke?
4. Er grænsen ved holdturnering −2 imp?

- **Commits:** `77ee5af` (specen rettet efter Franks svar, listen og stoppet) og denne med tokenforbruget.
- **`SYSTEM.md`:** rækken for Post Mortem 2a har fået Franks svar og stoppet i anden session, med "Venter på Franks svar; ikke flettet". Datoen øverst var allerede 17. november 2026.
- **Tokenforbrug** (anden session, 39 svar, målt før den sidste commit): nye input 78, skrevet til cachen 171.089, læst fra cachen 5.055.478 og output 55.285, i alt 5.281.930.

### Franks svar 2, 17. nov. 2026

> "Post Mortem 2a, svar fra Frank:
> Listen er rangeret, ikke en grænse: 'Spil værd at se på' viser de 8 spil med størst omkostning af egne beslutninger (kun den negative del), med deres mærker. Færre, hvis færre har en omkostning. 'Vis alle (N)' viser resten af de spil, der har mindst −2 point (ved holdturnering −2 imp) eller et af de faste mærker. De uheldige spil (bund uden fejl) står på én linje under listen: 'Uheldige, ingen fejl: spil …'. Skriv de 8 og linjen for 16. nov. under Afklaret, og ret accepttest 1.
> Spil 7 må falde ud af listen. PDF'en af spil 1 og 7 laves fra 'Alle spil'.
> Mærket 'Meldinger −N point' tilføjes.
> −2 imp ved holdturnering er godkendt.
> At 'anden kontrakt end feltet' tæller med, hvem der var spilfører, er godkendt.
> Byg nu i en frisk session på grenen: accepttestene først (røde), byg, og stop før merge med billeder og PDF. Kør alt i forgrunden. Stop ikke for listens længde igen; jeg vurderer den ved gennemgangen."

Afsnit 1 og accepttest 1 er rettet efter svaret. Listen er regnet som i første og anden session (feltets kontrakter fra `spilresultater-3287.html`, resten fra `src/test/data/par-3287.json`, feltet er de 7 andre borde og 6 i spil 32) og bygges ind i funktionen i tredje session.

**Spil værd at se på, 16. november (8 af 32):**

| Nr. | Spil | Kontrakt | Procent | Omkostning | Mærker |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | N 4♠ | 28,6 | −14 | Slem misset, Meldinger −14 point, Anden kontrakt end feltet |
| 2 | 4 | N 3NT | 71,4 | −10 | Heldigt: godt resultat, meldinger −10 point, anden kontrakt end feltet |
| 3 | 8 | Ø 3♥ | 21,4 | −9 | Bund, Modspil −2 stik |
| 4 | 25 | Ø 3♠ | 7,1 | −8 | Bund, Meldinger −1 point, Modspil −1 stik, Anden kontrakt end feltet |
| 5 | 29 | N 2♠ | 42,9 | −8 | Meldinger −4 point, Spilføring −1 stik, Anden kontrakt end feltet |
| 6 | 6 | N 3♠ | 42,9 | −7 | Udgang misset, Meldinger −7 point |
| 7 | 24 | Ø 2♠ | 14,3 | −6 | Bund, Meldinger −2 point, Modspil −2 stik, Anden kontrakt end feltet |
| 8 | 9 | Ø 3NT | 42,9 | −6 | Modspil −1 stik |

**"Vis alle (18)"** viser derudover de 10 andre (alle har en omkostning på −2 point eller lavere eller et fast mærke):

| Nr. | Spil | Kontrakt | Procent | Omkostning | Mærker |
| --- | --- | --- | --- | --- | --- |
| 9 | 5 | N 3NT | 57,1 | −6 | Heldigt: godt resultat, meldinger −2 point, spilføring −1 stik |
| 10 | 21 | N 2♥ | 57,1 | −6 | Heldigt: godt resultat, udgang misset, meldinger −6 point |
| 11 | 14 | V 4♠ | 28,6 | −5 | Udspillet kostede 1 stik, Anden kontrakt end feltet |
| 12 | 11 | N 4♠ | 85,7 | −5 | Heldigt: top, udgang meldt uden dækning, meldinger −5 point |
| 13 | 13 | N 1♥ | 71,4 | −4 | Heldigt: godt resultat, udgang misset, meldinger −2 point, spilføring −1 stik |
| 14 | 32 | Ø 3♥ | 41,8 | −2,3 | Meldinger −2,3 point |
| 15 | 17 | N 5♣ doblet | 14,3 | −2 | Bund, Udgang meldt uden dækning, Strafdobling, Meldinger −2 point, Anden kontrakt end feltet |
| 16 | 18 | S 1NT | 78,6 | −2 | Heldigt: top, udgang misset, meldinger −2 point, anden kontrakt end feltet |
| 17 | 22 | Ø 4♥ | 78,6 | −2 | Heldigt: top, udspillet kostede 1 stik |
| 18 | 19 | Ø 3♦ | 85,7 | −1 | Heldigt: top, udspillet kostede 1 stik, anden kontrakt end feltet |

**Linjen under listen:** "Uheldige, ingen fejl: spil 15, 20, 26 og 27" (15 og 20 er bund, 26 og 27 er 42,9 %).

**Ikke med (10 spil):** 2 (Top, Anden kontrakt end feltet), 3, **7** (Bund, Spilføring −1 stik, Anden kontrakt end feltet; omkostning −1 point), 10, 12, 16 (Top), 23 (Top, Anden kontrakt end feltet), 28 og 30 (Anden kontrakt end feltet) og 31.

**Valg, svaret ikke afgør** (tredje session):
- **Lighed i omkostning:** laveste procent først (ved holdturnering laveste imp), derefter laveste spilnummer. Det afgør, hvilke to af de fire spil med −6 point der kommer blandt de 8: 24 (14,3 %) og 9 (42,9 %) før 5 og 21 (57,1 %). Med spilnummer alene ville det være 5 og 9.
- **Heldige spil rangeres efter omkostningen** som de andre, fordi listen er rangeret efter omkostningen; specens tidligere "heldige og uheldige spil står sidst" er taget ud. Spil 4 (heldigt, −10 point) er derfor nummer 2.
- **De faste mærker** er de mærker, der i specen før svaret bragte et spil på listen, uden uheldigt, der har sin egen linje: udgang eller slem misset eller meldt uden dækning, strafdobling, udspillet og heldigt. 16. november ændrer heldigt intet, fordi alle heldige spil også har −2 point eller et andet fast mærke.
- **N i "Vis alle (N)"** er hele den lange liste (18), ikke kun resten (10).
- **Uheldigt** følger specens regel (under 50 %, ingen negativ egen faktor, Held og uheld negativ), så linjen har 26 og 27 med (42,9 %). Mente Frank kun bund ("bund uden fejl"), er linjen 15 og 20.
- **"Spil værd at se på" i filteret, udskriften og mailen** er de 8, som mock-up'en ("Side 2 af 9", "Værd at se på · 8"). Resten kommer med "Alle spil".
- **Meldinger −N point** har én decimal som bridge.dk's point (−2,3) og hele tal uden ",0" (−14).

### Tredje session (17.–18. november 2026, bygget og stoppet før merge)

- **Status:** Franks svar 2 er bygget på grenen `vaerd-at-se-paa`. Funktionen regner meldesamtalen, mærkerne og listen (`api/postmortem/vaerd.py`, felterne `vaerdAtSePaa`, `spil[].meldesamtale` og `spil[].vaerd` i `api/SVAR.md`). Appen har knapperne Udskriv, Mail og Kopiér, kortet "Spil værd at se på" med "Vis alle (18)", linjen med de uheldige og "Hvorfor er et spil med?", filteret "Værd at se på · 8", kortet Meldesamtalen øverst i analysevinduet, vinduet "Aftenen til makker" (`#/mail`) og udskriften. Alle tests er grønne. Intet er flettet, pushet eller udrullet, og `PLAN-postmortem-v2.md` er ikke rørt. **Venter på Franks godkendelse; ikke flettet.**
- **Afbrudt og genoptaget:** sessionen blev stoppet af 5-timersgrænsen efter bygningen (`a45c8f4`), mens Afklaret blev skrevet, og genoptaget i samme agent, da grænsen var nulstillet. Intet blev kørt om; Afklaret, `SYSTEM.md` og tokenforbruget er skrevet efter genoptagelsen.
- **Commits:** `570ca5f` (Franks svar 2 ordret, afsnit 1 og accepttest 1 rettet og listen for 16. nov.), `bc5ff8a` (accepttestene, røde), `a45c8f4` (bygningen), Afklaret og `SYSTEM.md` og til sidst tokenforbruget.
- **Rød → grøn:**

  | Test | Før bygningen (`bc5ff8a`) | Efter (`a45c8f4`) |
  | --- | --- | --- |
  | pytest i `api/` | 19 nye fejlede (KeyError på `vaerd`, `vaerdAtSePaa` og `meldesamtale`, ImportError på `postmortem.vaerd`); 286 bestod, 3 sprunget over; 268 s | 305 bestået, 3 sprunget over; 235 s |
  | `npm test` (tsc og vitest) | 31 nye fejlede (`vaerd` 8, `meldesamtale` 12, `mail` 11: kortene og knapperne fandtes ikke); 117 bestod; 21 s | 148 bestået i 12 filer; 24 s |
  | `node tools/tjek_bredde.mjs` | 36 nye FEJL (kortet, valget under Udskriv, mailen og Meldesamtalen fandtes ikke); 325 ok; 64 s | 394 ok; 96 s |
  | `node tools/tjek_udskrift.mjs` (ny, accepttest 4) | FEJL: ingen knap Udskriv; 21 s | alle 18 tjek i orden (9 og 33 A4-sider, intet løber over, kun ♥ og ♦ røde); 22 s |
  | `npm run build` | – | i orden |

  Fagord og bydeform er `src/test/sprog.test.tsx` i `npm test`; den læser nu også mailen for alle tre testsvar, aftenen 16. november med udskriften og spil 1 og 17.
- **Listen for 16. november** er som under "Franks svar 2": de 8 er 1, 4, 8, 25, 29, 6, 24 og 9, "Vis alle (18)" viser derudover 5, 21, 14, 11, 13, 32, 17, 18, 22 og 19, og linjen er "Uheldige, ingen fejl: spil 15, 20, 26 og 27". Mærkerne er tabellernes, og testene skriver hele listen (`src/test/vaerd.test.tsx` og `api/tests/test_vaerd.py` med `-rP`).
- **Meldesamtalen i spil 1 og 17:** spil 1 har fit 9 hjerter (6–3), udgang ja (12 stik i sans og hjerter; 7 af 7 borde), slem måske (0 af 7 borde), overstikket afgørende og "I (ingen konkurrence)". Spil 17 har fit 9 klør (7–2), udgang nej (8 stik i hjerter og klør; 2 af 7 borde, meldt uden dækning), slem "–", overstikket afgørende og "Modparten (konkurrence)" med trumf 9 klør mod 8 spar, i alt 17, og "Bedst for jer: at forsvare mod 3♠". Mock-up'ens "8 spar (5–3)" og "2 af 7 borde" i spil 1 var eksempeldata.
- **Testene rettet under bygningen:**
  - Spil 17: 2 af 7 borde meldte udgang (5♣ og 5♣ D), ikke 1, som accepttesten sagde efter en tællefejl. Funktionen og testens egen gennemregning af feltet gav begge 2.
  - `src/test/teknik.test.tsx`: overskrifternes rækkefølge har nu "Spil værd at se på" først (skærm 1), og "et svar uden de nye felter" er også uden felterne fra v2a. Filteret "Værd at se på · 8" står efter "Tabte point", så de eksisterende filtres rækkefølge er som før.
  - `src/test/raad.test.tsx` "hvert spil" har 60 s: den løb over standardgrænsen på 5 s (5096 ms), da de nye testfiler kørte samtidig.
  - Uændret (accepttest 7): de tre testsvar i `src/test/data/` er lavet igen, og kun de nye felter er kommet til (`test_vaerd.py::test_7_alt_andet_i_svaret_er_som_foer`).

**Valg, specen eller svaret ikke afgør** (ud over valgene under "Franks svar 2"):
1. **Beskrivende form, hvor mock-up'en eller specen har bydeform:** skærm 3 hedder "Aftenen til makker" (mock-up'en: "Send aftenen til makker"); "Beslutningen bedømmes, ikke kun resultatet" (mock-up'en: "Bedøm beslutningen …"); "Teksten sættes ind i mailen" (mock-up'en: "Sæt teksten ind …"); "Bedst for jer: selv at spille 4♠" og "at forsvare mod 3♠" (specen: "spil selv / forsvar mod X"). Knapperne (Udskriv, Udskriv nu, Kopiér, "1. Kopiér gennemgangen", "2. Åbn mail, og sæt ind", "Vis alle (N)", "Vis færre") og "Spørg hinanden", afsnittets navn i specen, står på bydeformtestens `UNDTAGELSER`; "Spil værd at se på" og "spil 15" er navneord (`FALSKE_TRÆF`).
2. **Husets ord:** "Stoppede vi i 3NT før et muligt majorfit?" (specen: "en mulig majorfit").
3. **Grunden i felterne:** feltet viser den korte grund ("9 hjerter", "7 af 7 borde", ved holdturnering "det andet bord" eller "ikke det andet bord"), og folden har facit: "Facit: 12 stik i sans og hjerter med åbne kort; 0 af 7 borde meldte slem." Stikkene er de vindende benævnelser med flest stik (ved nej benævnelserne med flest stik). Mock-up'ens "alle borde" er skrevet som "7 af 7 borde".
4. **Folderne:** dem med spørgsmål står først og er åbne (som på skærm 2), de andre er lukkede i rækkefølgen fit, udgang, slem. Mock-up'ens forklaring under felterne ("✓ ja · ~ måske · ✗ nej …") er ikke med, fordi ordet står ved symbolet.
5. **Mærkernes detaljer:** misset gives for udgang og slem hver for sig, så et spil stoppet under udgang, hvor slem vinder, får begge (ingen 16. november); meldte I slem, gives kun "Slem meldt uden dækning", ikke også udgang; strafdobling gælder kontrakten ved jeres bord, uanset hvem der var spilfører. Slem vises også, når I meldte slem, selv om udgang er nej.
6. **Hvem ejede spillet:** siden er fortegnet på par-scoren, "Bedst for jer" er par-kontrakten (også en offermelding), og trumftallet er hver sides længste farve sammen (ved lighed spar, hjerter, ruder, klør). Uden konkurrence står kun "I" eller "Modparten" med "(ingen konkurrence)"; par pas giver "Ingen (par er pas)".
7. **Mailen:** grunden står ved måske og ved meldt uden dækning ("Udgang: måske, 10 stik i spar; 1 af 7 borde."); ja og nej står alene, og slem "–" er udeladt. Linjen med de uheldige står efter spillene ved "Spil værd at se på". Ved holdturnering står bordet og retningen ("Bord 2, Nord–Syd"), ikke holdets navn, og emnet har imp ("Post Mortem: 11. november, −15 imp"). På en telefon (`pointer: coarse`) med `navigator.share` deler knap 2 hele teksten.
8. **Kopiér på oversigten** kopierer "Spil værd at se på" (de 8); valget af spil står i vinduet Mail.
9. **Udskriften:** side 1 har titlen "Gennemgang af aftenen", resultatet, faktorerne og listen over de valgte spil med mærkerne (og linjen med de uheldige ved "Spil værd at se på"); med alle 32 spil står listen tættere (8,5 pt) for at holde sig på én side. Feltet på spillets side er scorerne, som i analysevinduet: svaret har ikke feltets kontrakter, som mock-up'en viser. Udskriften er skjult for skærmlæsere, fordi skærmen har det samme. Mock-up'ens linje "Er notatet skrevet i appen (v2b) …" er ikke med.
10. **Analysevinduet:** kun kortet Meldesamtalen er nyt (afgrænsningen); mock-up'ens kort "Hvad skete der?" er ikke bygget, fordi "Ved jeres bord" viser det samme, og "Skriv spilnotat (v2b)" kommer i v2b.

**Spørgsmål til Frank:**
1. Linjen med de uheldige følger specens regel (under 50 %, ingen egne fejl), så 26 og 27 (42,9 %) er med. Mente du kun bund ("bund uden fejl"), er linjen 15 og 20.
2. "Spil værd at se på" i udskriften, mailen og filteret er de 8. Skal det være de 18, når "Vis alle" er åben?
3. Heldige spil rangeres efter omkostningen som de andre, så spil 4 (heldigt, −10 point) er nummer 2. Skal heldige stå sidst, som specen sagde før svar 2?
4. `tools/tjek_udskrift.mjs` er nyt. Skal `Postmortem/CLAUDE.md` og README have en linje om det ved fletningen?
5. Stadig til bekræftelse: grænserne for bund og top (25 % og 75 %), "halvdelen af feltet" og de 25 procentpoint for overstikket.

- **Skærmbilleder og PDF** (uden for git, ingen spillernavne), ved 390 og 1280 px for 16. november:
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-spil-vaerd-at-se-paa-8-spil-og-uheldige.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-spil-vaerd-at-se-paa-8-spil-og-uheldige.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-vis-alle-18-aaben.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-vis-alle-18-aaben.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-linjen-med-de-uheldige.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-linjen-med-de-uheldige.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-hvorfor-er-et-spil-med.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-hvorfor-er-et-spil-med.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-knapperne-og-valget-under-udskriv.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-knapperne-og-valget-under-udskriv.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-1-aften-hele-siden.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-1-aften-hele-siden.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-2-meldesamtalen-spil-1.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-2-meldesamtalen-spil-1.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-2-meldesamtalen-spil-17.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-2-meldesamtalen-spil-17.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\390-3-mail-spil-vaerd-at-se-paa.png`
  - `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\1280-3-mail-spil-vaerd-at-se-paa.png`
  - PDF af udskriften "Alle spil" med side 1, spil 1 og spil 7 (Chromes `Page.printToPDF`, `node tools/tjek_udskrift.mjs --pdf=…`): `C:\Users\frank\Kontraktbridge\skaermbilleder\vaerd-at-se-paa\udskrift-alle-spil-side-1-spil-1-og-7.pdf`
- **`SYSTEM.md`:** rækken for Post Mortem 2a har fået Franks svar 2, bygningen og afbrydelsen med "Venter på Franks godkendelse; ikke flettet", og datoen øverst er 18. november 2026. Filen har stadig LF-linjeskift og hverken navne eller hemmeligheder.
- **Tokenforbrug** (tredje session, hele agentens logfil med afbrydelsen og genoptagelsen, 135 svar fra 17. nov. kl. 22.15 til 18. nov. kl. 06.15 UTC, målt før den sidste commit): nye input 272, skrevet til cachen 1.232.843, læst fra cachen 48.437.921 og output 269.442, i alt 49.940.478.

## Arbejdsgang

1. Arbejd i en frisk session, og kør alt i forgrunden.
2. Opret tagget og grenen.
3. Mock-up'ens seks filer ligger allerede i `docs/specs/design/v2a/`. Commit dem på grenen.
4. Skriv accepttestene, så de er røde, og byg derefter.
5. Stop før merge. Send skærmbilleder af skærm 1–3 ved 390 og 1280 px og en PDF af udskriften for spil 1 og 7.
