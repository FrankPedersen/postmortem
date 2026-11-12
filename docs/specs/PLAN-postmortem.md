# PLAN – Post Mortem (egen app) og løseren til hele spillet (dobbeltdummy)

11. november 2026 · Frank og rådgiveren (skrevet med Fable). Plan, ikke spec. Specen til hvert trin skrives for sig.

## Egen app (Franks afgørelse 11. november)

Post Mortem er **sin egen app**, ikke et spor i Fordelingstræneren: eget repo `Postmortem`, egen adresse `www.kontraktbridge.dk/postmortem/`, eget kort i det tomme felt på forsiden, og alt regnes på serveren (Azure Function), ikke lokalt. Samme stak som Fordelingstræneren (Vite, React, TypeScript, vitest, PWA), samme designsystem (tokens, Inter/Manrope, forsidens farver) og samme arbejdsgang (spec, accepttest først, tag, stop før merge), så Claude Code kender mønstret. Appen er tynd: den tager et link, kalder funktionen og viser JSON; al læsning af bridge.dk, DDS og faktorerne ligger i funktionen. Fordelingstræneren røres ikke; løseren i browseren (lag B, wasm) kommer først, når Spilplan v2 skal bruge den, og så i Fordelingstræneren. Denne plan flyttes ind i repoet som `docs/specs/PLAN-postmortem.md`, når repoet er oprettet.

## Mål

Appen **Post Mortem** (post mortem: makkerparrets eller den enkeltes gennemgang af egne spil bagefter), bygget som Farvebehandling – Analyse: brugeren giver et helt spil (typisk klubaftenens spil fra bridge.dk), og træneren viser, hvad der kan vindes, og hvor **slutspil** og **skvis** er mulige, så Frank lærer at spotte situationerne. Det vigtigste først: at se, i hvilke spil et slutspil eller en skvis er mulig, og hvor i spillet det sker.

Løseren er motoren bag sporet og bruges senere også til Spilplan v2 og facitterne i Modspil v2.

## Afgørelser (Frank, 11. november)

1. Første bruger af løseren er sporet Post Mortem med klubbens spil fra bridge.dk. Frank oplyser, at data derfra må bruges uden restriktioner.
2. Motoren er DDS (Bo Haglund og Soren Hein, `github.com/dds-bridge/dds`). Vi skriver ikke en løser selv.
3. Alcatraz Coup er ude af kataloget (ulovligt kneb, ikke en teknik). Deschapelles, Merrimac og Crocodile hører til sporet Modspil.
4. Spil fra *Planen der vinder* må bruges som accepttest: kendte spil med kendt facit og kendt teknik, både som positive eksempler (skvis/slutspil skal findes) og som negative (almindelige spil må ikke få et fund).

## Arkitektur: to lag med samme motor

**Lag A, offline (Python + `endplay`, som pakker DDS ind).** Et værktøj på Franks pc (`tools/` i dette repo): henter spil fra bridge.dk, regner dobbeltdummy, finder nøglebeslutninger, slutspil og skvis, og skriver JSON, som appen indlæser. Lag A bruges i trin 1 og giver sporet alt, hvad det skal vise, uden at browseren regner.

**Lag B, i browseren (DDS som WebAssembly, i en web worker).** Skal til, når brugeren selv spiller kortene og skal have svar på "hvad kostede det kort?" (Spilplan v2). Ikke en del af trin 1.

**Valget af DDS til browseren (set 11. november, trin 0 afgør det endeligt):** DDS er i mellemtiden blevet til **DDS3** (Bazel-bygning, modern API, egne Python-, .NET- og Java-bindinger) og har nu sin **egen hermetiske wasm-bygning og en browserdemo under `web/`** (udgivet på dds-bridge.github.io/dds). "Egen bygning" betyder derfor ikke at opfinde noget: det er at bygge DDS3's eget wasm-mål fra kilden med den Emscripten-version, repoet selv pinner, og lægge `dds.js` + `dds.wasm` i appen bag en web worker. Alternativ opskrift: `jmegner/BridgeDealAnalyzerWeb`, et lille Python-script, der henter en pinnet DDS3-revision, kompilerer med Emscripten og skriver `dds.js`/`dds.wasm`, med worker og "optimal linje" i JS. Nødløsning: npm-pakken `@bridge-tools/dd`.

Krav til bygningen: **enkelttrådet** (ingen pthreads/SharedArrayBuffer, fordi GitHub Pages ikke kan sætte cross-origin-isolation-headere); det skal trin 0 bekræfte. **Lag A** skal helst bruge DDS3's egen Python-pakke (`dds3`) i samme version som wasm'en, så de to lag giver samme tal pr. konstruktion; `endplay` er nødløsningen, hvis `dds3` ikke installerer på Windows.

**Licens:** DDS er Apache 2.0 (tjekkes i trin 0 mod repoets LICENSE); `endplay` tjekkes samtidig. Begge nævnes i sidefoden og README.

## Indgangen: altid et link, og en guide

Brugeren indsætter altid selv et link fra resultater.bridge.dk; appen gemmer ingen aftener og har ingen delelinks (en makker indsætter samme link). Startskærmen er ét felt til linket, knappen "Analysér" og en **guide**, som i Farvebehandling – Analyse: (1) find din klub og turnering på resultater.bridge.dk; (2) åbn Bordresultater (holdturnering) eller Personligt regnskab (parturnering) for jeres par eller hold; (3) kopiér adressen fra browserens adresselinje (hele linjen med `filename=...`), og sæt den ind her. Guiden viser de to sidetyper med et billede af, hvor adressen er, og siger, hvad appen gør med linket (henter siden én gang, gemmer kun spil og tal, ingen navne). Fejl siges klart: "Det er ikke et link fra resultater.bridge.dk", "Siden har ingen spil" eller "bridge.dk svarer ikke lige nu".

## Hvad appen viser (v1)

Appen får kortet **Post Mortem (PM)** i det tomme felt på www.kontraktbridge.dk. Skærmen bygges som Farvebehandling – Analyse: et analysevindue pr. spil og en oversigt for hele aftenen.

**Analysevinduet pr. spil** (Franks ønsker 11. november) fordeler parrets tab i forhold til feltet på fire faktorer, alle målt dobbeltdummy, så de kan regnes og testes:
- **Meldinger:** forskellen mellem parrets kontrakt og den bedste opnåelige kontrakt (par-kontrakten eller den bedste DD-kontrakt for parrets side), regnet i den score, kontrakterne giver med DD-stik. Siger også, om og hvor i meldeforløbet den rigtige kontrakt kunne nås (i v1 kun: nået, for høj, for lav, forkert farve).
- **Spilføring:** når parret var spilfører: DD-max efter udspillet minus opnåede stik. Færre stik end DD betyder, at spilfører fejlede et sted (DD-stik kan tages mod ethvert modspil). Flere stik end DD betyder, at modspillet fejlede.
- **Modspil:** når parret var i modspil: udspilseffekten (DD-max efter udspillet minus DD-max før) er udspillets pris, og spilførers overskud over DD-max efter udspillet er modspillets pris i spillet.
- **Held og uheld i forhold til feltet:** det, der er tilbage, når de tre faktorer er trukket fra: feltet fandt en anden kontrakt eller fik et andet resultat, uden at parret gjorde noget forkert dobbeltdummy (fx en udgang, der kun står på en kipning).

Vinduet slutter med **råd til spilføring**: nøglebeslutningerne i den bedste linje efter udspillet (hvilket kort, i hvilket stik, hvad det koster at vælge et andet), og mærkerne Slutspil muligt og Skvis mulig. Råd til modspillet (modspillets nøglebeslutninger i samme linje) tages med i v1, hvis skærmen kan bære det.

**Oversigten for aftenen** summerer de fire faktorer over alle spil ("hvor er den største forbedring"), viser et kort **Teknikker i aftenens spil** med ordbogens navne og antal (skvis, slutspil, eliminering, sikkerhedsspil, dyk og hold-up, trumfkup osv.), hvor mange af dem parret fandt, og hvor mange modspil der holdt DD-tallet, og lister spillene med mærker og filter pr. teknik.

**Analysevinduet har også Råd til modspillet** (Franks ønske 12. nov.): udspillets pris, det stik, hvor modspillet kunne have holdt spilfører på DD-tallet, og teknikken bag med ordbogens navne (hold-up, frafald, markering, gennemspil, trumfpres). Når parret selv var i modspil, står afsnittet først; var parret spilfører, viser det, hvad Ø–V ved de andre borde kunne gøre.

**Mockup (12. nov.):** designlærredet "Post Mortem – mockup" (tre skærme: Start og guide, Aftenens oversigt, Analysevindue pr. spil) i Fordelingstrænerens designsystem; sendes til Claude Code sammen med specen til vindue 1c.

For hvert spil fra klubaftenen vises desuden:
1. Dobbeltdummy-tabellen (stik for hver spilfører i hver farve) og par-kontrakten.
2. For den kontrakt, der blev spillet ved bordet: max stik før udspil, max stik efter det faktiske udspil (udspilseffekten), og det opnåede resultat.
3. **Nøglebeslutninger** i spilførerens linje: de stik, hvor kun ét eller få kort holder resultatet (DDS' AnalysePlay-tanke: stik tabt ved hvert alternativ).
4. **Mærker:** *Slutspil muligt* og *Skvis mulig*, med stiknummer og de kort, det drejer sig om. Definitionerne står nedenfor og er testbare.

Teknikkens navn (Vienna Coup, Morton's Fork osv.) sættes ikke af koden i v1. Kataloget (de 16 teknikker minus Alcatraz, med Smother Play og Devil's Coup slået sammen) bruges af forfatteren, når opgaver skrives til Avancerede teknikker (trin 3).

## Definitioner, der kan testes

Det er vigtigt, at mærkerne er definerede ved dobbeltdummy-tal, ikke ved mønstre i kortene. Udgangspunkt (Fable forfiner dem i specen til trin 1, og *Planen der vinder* afgør, om de rammer):

- **Slutspil muligt** i en stilling: en modspiller er inde (skal spille ud), og spilførers dobbeltdummy-stik med modspilleren på udspil er mindst ét højere end med spilfører selv på udspil i samme stilling. Dvs. det koster modspilleren et stik at være inde. Mærket sættes på det stik, hvor spilfører kan spille modspilleren ind, og kun hvis det indgår i en linje, der holder kontrakten.
- **Skvis mulig** i en stilling: en modspiller skal kaste af (kan ikke bekende, eller stikket er spilførers vinder), modspilleren holder garde i mindst to farver, og *ethvert* lovligt afkast koster et stik dobbeltdummy i forhold til stillingen, hvis modspilleren slap for at kaste af. "Slap for at kaste af" måles ved at løse stillingen uden det kort, spilfører indkasserer (truslen), og sammenligne. Fable afgør i specen, om denne måling er rigtig, eller om garde i en farve skal defineres for sig.
- **Nøglebeslutning:** et stik, hvor spilførers bedste kort holder resultatet, og mindst halvdelen af de andre lovlige kort koster et stik.

Alle tre defineres, så én test pr. spil fra *Planen der vinder* kan svare ja/nej.

## Det vedhæftede udkast (`solver.py`)

Bruges som inspiration til lag A, ikke som kode:
- Beholdes: brugen af `Deal`, `solve_board` og `play`; "max før og efter udspil"; hovedvarianten.
- Efterprøves først: stiktallet efter udspillet. Udkastet læser `sim_deal.first` og vender tallet med `13 − tricks`, men efter udspillet er bordet i tur. Test på et spil med kendt facit.
- Droppes: de fem teknikdetektorer (heuristikker med falske fund) og idéen om, at hovedvarianten er "spilførers linje" (den er dobbeltdummy for begge sider).
- Sprog: indgang/forbindelser (ikke indkomst), gaffel (ikke saks), kipning (ikke knibning), dyk/hold-up (ikke dykkerspil), trussel (ikke trusselskort). Husets ord: bordet, slutspil, skvis, indkassere, toppe farven.

## Azure (Franks spørgsmål 11. november)

Lag A behøver ikke ligge på Franks pc. Som **Azure Function** (`kontraktbridge-postmortem`, Python på Linux, forbrugsplan, ved siden af `kontraktbridge-kontakt`) bliver Post Mortem meget enklere for brugeren: man indsætter et link fra resultater.bridge.dk i appen, funktionen henter siden (uden CORS-problemet), læser spillene, kører DDS3 (`dds3`) og de fire faktorer, og svarer med JSON, som appen viser. Ingen lokal Python, ingen fil at åbne.

Det, Azure giver: (1) hentning fra bridge.dk direkte fra appen; (2) DDS på serveren, så Post Mortem slet ikke behøver wasm; (3) en **cache** (Blob Storage, nøgle = turnerings-id + sektion), så en klubaften kun regnes én gang. Deling sker ved at makkeren indsætter samme bridge.dk-link; appen har ingen egne delelinks (Franks afgørelse 11. nov.). Det, Azure ikke giver: svar kort for kort i Spilplan v2 (dér er wasm i browseren rigtig, uden ventetid og offline).

Krav og forbehold: funktionen tager kun adresser på `resultater.bridge.dk` og afviser alt andet; nøgle som i kontaktformularen; en klubaften med 32 spil skal regnes inden for forbrugsplanens tidsgrænse (DDS løser et spil på brøkdele af et sekund, så det er ingen hindring; koldstart på nogle sekunder vises som "regner…"). Resultatsiderne indeholder spillernes navne; cachen gemmer kun spil, kontrakter og tal, ikke navne, og appen henter navnene fra siden ved visning. Pris: forbrugsplanens gratis kvote dækker klubbrug; Blob Storage koster ører.

**Konsekvens for trinnene:** vindue 0 får ét punkt mere: `dds3` i en Python-funktion lokalt (Azure Functions Core Tools), så vi ved, at den native pakke kører på Linux-funktionen. Vindue 1a bliver "funktionen" i stedet for "værktøjet på pc'en"; lag B (wasm) rykker til Spilplan v2 og indtastning kort for kort og haster ikke for Post Mortem.

## Data fra bridge.dk

**Set 11. november** (resultater.bridge.dk, multihold_bordresultater.php, Franks klub, turnering 450): siden giver pr. spil giver, zone, alle fire hænder, datum, par-kontrakt, en **dobbeltdummy-tabel** (stik for N, S, Ø, V i sans og hver farve) og hp pr. hånd, samt pr. bord kontrakt med spilfører (bogstav), **udspil**, **antal stik**, score og imp. Spilføringen kort for kort findes ikke. Siden linker til Bridge Solver med spillet kodet i adressen; bag siden ligger en XML-fil (`2151/MT450GT714.XML`), som trin 0 prøver at hente direkte, ellers parses HTML'en.

**Personligt regnskab** (personligt_regnskab.php, parturnering, set 11. november): pr. spil modstandere, kontrakt med spilfører, udspil, stik, score NS/ØV, point (0–10) og procent, med rundesummer; hænderne står ikke på siden, men på Kortfordeling. Post Mortem skal derfor kunne læse begge: holdturnering (bordresultater, imp) og parturnering (personligt regnskab + kortfordeling, matchpoint), med parrets egne resultater fremhævet.

Konsekvenser: (1) DD-tabellen findes allerede på siden, så lag A's egen tabel bruges som kontrol af parseren (samme tal = rigtig læsning). (2) Nøglebeslutninger, slutspil og skvis vises for **den bedste linje** efter det faktiske udspil, ikke for det spillede forløb, som ikke kendes. (3) Det, der kan siges om bordet, er: max stik efter udspillet mod opnåede stik (stik tabt i spilføringen eller i modspillet, uden at vide hvor) og udspilseffekten (max før mod max efter udspillet).

Hentes af lag A (Python) på Franks pc, ikke af appen: browseren kan ikke hente fra bridge.dk uden CORS-tilladelse, og appen skal ikke have en server. Lag A skriver én JSON-fil pr. klubaften, som appen indlæser ved "Åbn fil" (og senere evt. ved indsat PBN/LIN). Parseren laves mod de konkrete resultatsider; formatet beskrives i specen til trin 1 med to gemte eksempelsider som test.

## Trin

0. **Afprøvning (én aften, Fable i Claude Code, ingen gren, alt i `~/Kontraktbridge/_lab/`, intet i repoerne):**
   - *Python:* `dds3` (ellers `endplay`) installeres; tre spil fra *Planen der vinder* løses, og DD-tabellen og max før/efter udspil tjekkes mod bogen. Fortegnet efter udspillet afgøres her.
   - *Wasm:* DDS3's eget wasm-mål bygges fra kilden (bazelisk; repoet henter selv Emscripten); hvis Bazel driller på Windows, bruges jmegner-scriptet. Det noteres, hvilke funktioner wasm-laget stiller til rådighed (SolveBoard, CalcDDtable, AnalysePlay), og om bygningen kræver tråde/SharedArrayBuffer.
   - *Vite:* `dds.js`/`dds.wasm` lægges i et tomt Vite-projekt i en web worker; de tre spil løses, og tallene sammenlignes med Python (skal være ens). Målt: starttid for wasm'en, tid pr. helt spil (SolveBoard og CalcDDtable) i Chrome på pc og på Franks telefon, og størrelsen af `dds.wasm` (rå og gzip).
   - *Licenser:* DDS3 er Apache 2.0 (bekræftet 11. nov.); `dds3`/`endplay` tjekkes.
   - *Resultat:* `docs/specs/NOTAT-loeser-afproevning.md` med måletabel, de fundne begrænsninger og en anbefaling: dds3+egen wasm, jmegner-opskriften eller @bridge-tools/dd. Accepttest for vinduet: samme tal i Python, wasm og bogen for de tre spil; et helt spil løses på telefonen inden for en tid, Frank kan leve med (forslag: under 2 sekunder for SolveBoard).
1. **Lag A og sporet Analyse af spil (repoet `Postmortem` og funktionen):** parser, løser, JSON-format, definitionerne ovenfor, skærmen med DD-tabel, nøglebeslutninger og mærker. Accepttest: spil fra *Planen der vinder* (positive og negative) og én gemt klubaften. Tests i `tools/` (Python) og `src/` (vitest). `npm test` kører alene.
2. **Lag B (gren `loeser-wasm`):** DDS i appen bag en web worker; samme tal som lag A på samme spil; "hvad kostede det kort?" på klubaftenens spil.
3. **Avancerede teknikker** som opgavetype med håndplukkede spil fra kataloget; Spilplan v2 og Modspil v2 bruger løseren.

**Modelvalg:** trin 0, definitionerne i trin 1 og lag B skrives og bygges med Fable; skærm og parser kan bygges med Opus. Gennemgangen i chatten sker med Opus.

## Indtastning kort for kort (v2)

Post Mortem skal senere kunne tage et spil indtastet kort for kort (fra Franks egne noter), så nøglebeslutningerne og faktorerne vises for det faktiske forløb og ikke kun for den bedste linje. Det kræver lag B (DDS i browseren) og en indtastningsskærm; det er trin 2.

## Estimat (Claude Code-tid, vinduer på ca. 5 timer)

Hele planen kan ikke laves i ét vindue. Delt op:

| Vindue | Indhold | Passer i 5 timer? |
| --- | --- | --- |
| 0 | Afprøvning: endplay på tre spil fra Planen der vinder, egen wasm-bygning i tomt projekt, tid og størrelse på pc og telefon, licenser, notat | Ja, med luft |
| 1a | Lag A: parser til bordresultater og personligt regnskab + kortfordeling (med to gemte sider som test), DD-tabel som kontrol, udspilseffekt, JSON-format, de fire faktorer pr. spil | Ja, hvis XML'en kan hentes; ellers knebent |
| 1b | Definitionerne Slutspil muligt, Skvis mulig og Nøglebeslutning i lag A, med Planen der vinder som positive og negative tests | Usikkert: definitionerne kan kræve flere forsøg; regn med ét vindue plus rettelser |
| 1c | Appen Post Mortem (nyt repo fra Fordelingstrænerens skabelon): link ind, kald af funktionen, oversigt for aftenen, analysevindue pr. spil med faktorer og råd, PM-kortet på kontraktbridge.dk, tests, udgivelse på GitHub Pages | Ja, hvis 1a's JSON ligger fast; layoutet som Farvebehandling – Analyse |
| 2 | Lag B: DDS i web worker, samme tal som lag A, indtastning kort for kort | Nej: to vinduer |

I alt fire vinduer til v1 (0, 1a, 1b, 1c), og 1b er det usikre. Hvert vindue har sin egen spec, gren og godkendelse.
