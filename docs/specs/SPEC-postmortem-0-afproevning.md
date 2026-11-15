# SPEC – Post Mortem, vindue 0: afprøvning af løseren

12. november 2026 · Frank. **Model: Fable.** Plan: `PLAN-postmortem.md`. Mockup: designlærredet "Post Mortem – mockup".

## Formål

Før der bygges noget, skal vi vide, at DDS3 kan køre dér, hvor Post Mortem skal regne (Python i en Azure Function på Linux), at tallene er rigtige, og hvor meget det koster i tid. Resultatet er et notat med måling og anbefaling, ikke kode til appen.

## Afgrænsning

- Alt arbejde sker i `C:\Users\frank\Kontraktbridge\_lab\postmortem-0\`. **Intet ændres i Forside, Konventionstræner, Fordelingstræneren eller bridge-model**, og der oprettes ingen gren, intet tag og intet nyt repo.
- Ingen deploy til Azure. Funktionen køres kun lokalt.
- **Testspil:** tre hele spil (alle 52 kort) med kendt facit fra lektionerne i `C:\Users\frank\BerlingskeBridge\` (`lek01.pdf`–`lek28.pdf` og `Et_ niveau_op-13-Spilfoering i Sans.pdf`): ét med skvis, ét med slutspil, ét almindeligt uden særlig teknik. Et spil dur kun, hvis alle fire hænder står i lektionen, og lektionen siger, hvor mange stik der kan tages, og hvordan. Findes der ikke en skvis eller et slutspil i lektionerne, så notér det, og tag i stedet to spil med en kipning eller en etablering; mærkerne testes så kun på det negative. Skriv spillene som PBN i `testspil.pbn` med kilde (fil og side) i en kommentar.
- Kræver noget alligevel en ændring ud over dette, stopper Claude Code og spørger.

## Opgaver

1. **DDS3 i Python.** Installér `dds3` (DDS3's egen Python-pakke) i et virtuelt miljø. Installerer den ikke på Windows, så prøv `endplay`, og notér forskellen. Skriv `solve.py`, der tager et spil i PBN, og giver (a) DD-tabellen (stik for N, S, Ø, V i ♣ ♦ ♥ ♠ NT), (b) par-kontrakt, (c) max stik for en given kontrakt før udspil og efter et givet udspil. Kør de tre spil, og sammenlign med bogen.
2. **Fortegnet efter udspillet.** Afgør med de tre spil, hvilken side DDS' stiktal gælder for, når et udspil er spillet (den side, der er i tur, eller udspilleren). Skriv svaret i notatet med et konkret eksempel.
3. **Første udkast til mærkerne.** Skriv `maerker.py` med de tre definitioner fra planen (Slutspil muligt, Skvis mulig, Nøglebeslutning), så enkelt som muligt. Kør dem på de tre spil: skvis-spillet skal give "Skvis mulig", slutspils-spillet "Slutspil muligt", og det almindelige spil ingen af delene. Fejler det, så beskriv, hvorfor definitionen rammer forkert; ret den ikke færdig, det er vindue 1b.
4. **Lokal Azure Function.** Lav en Python-funktion (v2-programmeringsmodellen) med Azure Functions Core Tools, der tager en PBN-streng som POST og svarer med DD-tabellen som JSON. Kør den lokalt. Kan den køres i Linux lokalt (WSL eller Docker med `python:3.11-slim`), så gør det; ellers kør på Windows, og notér, at Linux ikke er testet.
5. **Mål.** Tid pr. spil for DD-tabellen (CalcDDtable) og for ét SolveBoard efter udspil, som gennemsnit af de tre spil, på Franks pc. Tid for 32 spil i én kørsel (tabellen alene). Størrelse af det virtuelle miljø med `dds3`.
6. **Licenser.** Bekræft licensen for DDS3 og `dds3`/`endplay` fra pakkerne selv, og notér, hvad der skal stå i sidefoden.
7. **bridge.dk.** Hent de to eksempelsider (bordresultater, turnering 450, og personligt regnskab, turnering 3252, par 11) og gem dem som filer til senere test. Prøv, om XML-filen i `filename=` kan hentes direkte; notér svaret. Ingen parser skrives nu.

## Accepttest

- `solve.py` giver samme DD-tabel og samme max før/efter udspil som bogen for de tre spil.
- `maerker.py` giver rigtigt mærke på alle tre spil, eller notatet forklarer, hvorfor ikke.
- Den lokale funktion svarer rigtigt på de tre spil.
- Notatet `_lab/postmortem-0/NOTAT-afproevning.md` har: måletabel, fortegnsreglen, licenser, bridge.dk-svaret og én anbefaling til vindue 1a (dds3 eller endplay; Linux testet eller ej).

## Afklaret

Kørt 12. november 2026 af Claude Code (Fable 5.2). Alt ligger i `_lab\postmortem-0\`; ingen repoer er rørt, og intet er deployet. Notatet er `_lab\postmortem-0\NOTAT-afproevning.md`.

1. **Testspil:** lektionerne ligger i `C:\Users\frank\Downloads\BerlingskeBridge\`. De har ingen skvis og kun én bemærkning om slutspil (lek29). De tre spil er lek29 side 6 (slutspil nævnt), lek28 side 3 (frafald) og lek05 side 6 (almindeligt); de står i `testspil.pbn`.
2. **Opgave 1:** `dds3` findes ikke på PyPI og kan kun bygges med Bazel og en C++-compiler til CPython 3.14, så `endplay` 0.5.12 er brugt på en bærbar Python 3.12 i lab-mappen. `solve.py` giver samme tal som lektionerne i spil 2 og 3 (9 og 7 stik før og efter udspil). I spil 1 er tallet før udspil 8 som i lektionen, men 9 efter ♥D: lektionens 8 gælder den naturlige linje, ikke dobbeltdummy.
3. **Opgave 2, fortegnet:** DDS' tal gælder den side, der er i tur. Efter udspillet er bordet i tur, så tallet er spilførersidens og skal ikke vendes.
4. **Opgave 3, mærkerne:** skvis er rigtigt negativ på alle tre spil. Slutspillet i spil 1 findes ikke, fordi det kun opstår i lektionens linje, ikke i dobbeltdummy-linjen. Nøglebeslutning rammer for bredt. Planens måling af skvis kan ikke regnes med DDS, fordi hænder med ulige mange kort tolkes som midt i et stik. Det er beskrevet i notatet og ikke rettet færdigt.
5. **Opgave 4:** den lokale funktion svarer rigtigt på de tre spil på Windows. Linux er ikke testet (hverken Docker eller WSL-distribution på pc'en).
6. **Opgave 5:** DD-tabel 92 ms pr. spil, SolveBoard efter udspil 23 ms koldt, 32 spil 3,5 s i ét kald, miljøet 144 MB.
7. **Opgave 6:** DDS er Apache 2.0, `endplay` MIT.
8. **Opgave 7:** fem sider er gemt i `bridgedk\` ud fra Franks to adresser (turnering 450 og 452, ikke 3252). XML-filen kan ikke hentes direkte (404).
9. **Anbefaling til vindue 1a:** `endplay` på Python 3.12; første skridt er at køre funktionen i Linux.

## Besked til Claude Code

> Model: Fable. Læs `C:\Users\frank\Kontraktbridge\PLAN-postmortem.md` og `SPEC-postmortem-0-afproevning.md`. Arbejd kun i `_lab\postmortem-0\`, og rør ingen af repoerne. Løs opgave 1–7 i rækkefølge, skriv notatet, og stop. Kan du ikke finde tre egnede spil i lektionerne, så spørg, før du begynder på opgave 1.
