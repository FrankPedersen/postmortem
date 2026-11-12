# NOTAT – Post Mortem, vindue 0: afprøvning af løseren

12. november 2026 · Claude Code (Fable 5.2) · spec: `SPEC-postmortem-0-afproevning.md` · alt ligger i `_lab\postmortem-0\`. Ingen repoer er rørt, og intet er deployet.

## Anbefaling til vindue 1a

**Brug `endplay` 0.5.12 på Python 3.12, ikke `dds3`.** Linux er ikke testet.

- `dds3` findes ikke på PyPI. Den kan kun bygges fra kilden med Bazel og en C++-compiler, og hjulet er låst til CPython 3.14. Pc'en har ingen compiler, og en Azure Function skal alligevel køre en Python-version, som `endplay` har færdige hjul til.
- `endplay` installerer med `pip` på Windows og har færdige Linux-hjul (manylinux, x86_64 og arm64) til Python 3.9–3.13. Den giver rigtige tal på de tre testspil og på spil 1 fra bridge.dk.
- Det, vindue 1a skal gøre først: køre funktionen i Linux (WSL-distribution eller Docker), for det er ikke gjort her.

## Måletabel

Franks pc, Windows 11, Python 3.12.10, `endplay` 0.5.12 (med DDS som `dds.dll`).

| Måling | Resultat |
| --- | --- |
| DD-tabel for ét spil (calc_dd_table), gennemsnit af de tre testspil | 92 ms (97, 130 og 50 ms) |
| SolveBoard efter udspillet, koldt (ny proces), de tre testspil | 35, 21 og 12 ms; gennemsnit 23 ms |
| SolveBoard efter udspillet lige efter tabellen i samme proces | ca. 0,1 ms (DDS genbruger sin hukommelse) |
| 32 tilfældige spil, tabellen alene, ét kald (calc_all_tables) | 3,5 s |
| 32 tilfældige spil, tabellen alene, et spil ad gangen | 5,9–6,5 s |
| Den lokale funktion, regnetid for tabellen pr. kald | 140–370 ms |
| Det virtuelle miljø med `endplay` og `azure-functions` | 144 MB; `endplay` selv fylder 1 MB |

`endplay` trækker `numpy` og `matplotlib` med (ca. 120 MB af de 144). Det betyder noget for funktionens pakke og koldstart; vindue 1a bør se, om de kan udelades.

## Testspillene

Lektionerne ligger i `C:\Users\frank\Downloads\BerlingskeBridge\` (ikke direkte under `frank`), og der er 43 lektioner plus "Et niveau op". De er et begynderkursus: **ingen skvis**, og slutspil nævnes én gang (lek29). "Et niveau op"-filen har ingen tekst, der kan trækkes ud. De tre spil står i `testspil.pbn` med fil og side:

| Spil | Kilde | Kontrakt og udspil | Lektionens facit | DD før udspil | DD efter udspil |
| --- | --- | --- | --- | --- | --- |
| 1 | lek29 side 6 (Stik ikke automatisk) | 3NT i Syd, ♥D | 8 stik mod bedste modspil, med slutspil mod Øst | 8 | 9 |
| 2 | lek28 side 3 (Frafald med dobbelthold) | 3NT i Syd, ♦D | 9 stik med frafald | 9 | 9 |
| 3 | lek05 side 6 (Planlægning, spil 1) | 1NT i Syd, ♦D | 7 stik | 7 | 7 |

Lektionerne viser hverken giver, zone eller DD-tabel, så tabellen kan kun tjekkes på kontraktens tal. Spil 2 og 3 stemmer. I spil 1 stemmer tallet før udspil (8), men efter ♥D giver dobbeltdummy 9: kun et sparudspil holder Syd på 8. Lektionens 8 stik gælder den naturlige linje med klørkipningen, ikke dobbeltdummy. Det er ikke en fejl i løseren.

## Fortegnsreglen

**`solve_board` giver stik for den side, der er i tur, talt fra stillingen og frem.** Efter udspillet er bordet i tur, så tallet er spilførersidens og skal ikke vendes. Udkastets `13 − tricks` efter udspillet er forkert.

Eksempel, spil 1 (3NT i Syd):
- Før udspil er Vest i tur. DDS giver ♥D 4 stik og ♠10 5 stik: det er Øst–Vests stik. Spilfører får altså 13 − 4 = 9 efter hjerter og 13 − 5 = 8 efter spar.
- Efter ♥D er Nord (bordet) i tur. DDS giver 9: det er Nord–Syds stik direkte.
- `analyse_play` giver samme række set fra spilfører: 8 før udspil, 9 efter ♥D.

## Mærkerne (`maerker.py`)

| Spil | Slutspil muligt | Skvis mulig | Nøglebeslutning |
| --- | --- | --- | --- |
| 1 (lektionen nævner slutspil) | nej | nej | 14 fund |
| 2 (frafald) | nej | nej | 7 fund |
| 3 (almindeligt) | nej | nej | 3 fund |

- **Skvis** er rigtigt negativ på alle tre. Der var intet skvis-spil at teste positivt på.
- **Slutspil** blev ikke fundet i spil 1. Lektionens slutspil opstår kun, når Øst har faldet fra tre gange i den naturlige linje. Dobbeltdummy efter ♥D tager Syd 9 stik uden slutspil, og mærket måles kun langs den linje. Definitionen er altså ikke prøvet positivt.
- **Nøglebeslutning** rammer for bredt. Den finder frafaldet i spil 2 (stik 1: bordet lille ruder, Syd ♦5), men melder også selvfølgelige valg sent i spillet ("1 af 1 andre valg koster").

Det, vindue 1b skal tage stilling til:
1. **Planens måling af skvis kan ikke regnes.** DDS tolker hænder med ulige mange kort som "midt i et stik", så "løs stillingen uden det kort, spilfører indkasserer" findes ikke som stilling. Udkastet bytter i stedet kortet med et dødt kort og melder skvis, når kortet er mindst to stik værd. På en konstrueret slutstilling gav det 3 stik med klør es mod 1 uden. Målingen er grov: et kort kan også være to stik værd som indgang.
2. **Én DD-linje er for lidt.** Mærkerne afhænger af, hvilket af de lige gode kort der spilles. 1b bør se på alle kort, der holder DD-tallet, eller på det faktiske forløb.
3. **Nøglebeslutning skal skæres til**, fx kun når der er mindst tre valg, og ikke i de sidste stik.
4. **Der mangler positive testspil.** Lektionerne har hverken skvis eller et slutspil, der holder dobbeltdummy. *Planen der vinder* eller konstruerede spil skal til.

## Den lokale Azure Function

- `funktion\function_app.py` (Python v2-modellen): POST en PBN-deal til `/api/ddtabel`, svar er DD-tabellen som JSON. Ugyldig PBN giver 400.
- Kørt lokalt på Windows med Azure Functions Core Tools 4.16.0, installeret med `npm` i `funktion\node_modules` (ikke globalt). De tre spil gav samme tabel som `solve.py`.
- **Linux er ikke testet:** pc'en har hverken Docker eller en WSL-distribution.
- Det virtuelle miljø skal være aktiveret, når `func start` køres. Ellers vælger Core Tools systemets Python 3.14, hvor `endplay` ikke findes.

## Licenser

| Pakke | Licens | Kilde |
| --- | --- | --- |
| DDS (Bo Haglund og Soren Hein) | Apache 2.0 | `LICENSE` i `github.com/dds-bridge/dds` |
| `endplay` 0.5.12 (Dominic Price) | MIT | pakkens `LICENCE` og metadata |
| `dds3` | ikke brugt | findes ikke på PyPI |

Sidefoden og README skal nævne begge, fx: "Dobbeltdummy-beregningen bruger DDS af Bo Haglund og Soren Hein (Apache 2.0) gennem endplay af Dominic Price (MIT)." Hvilken DDS-version `endplay` har med, står ikke i pakken; det bør 1a slå op i `endplay`s kilde.

## bridge.dk

Hentet 12. november 2026 og gemt i `bridgedk\` til senere test:

| Fil | Side | Størrelse |
| --- | --- | --- |
| `scoresheet-450.html` | scoresheet, turnering 450, sektion 2, runde 2 (Franks link) | 71 kB |
| `bordresultater-450.html` | multihold_bordresultater, samme kamp, 16 spil | 511 kB |
| `spilresultater-452.html` | spilresultater, turnering 452, par 1 (Franks link), 32 spil | 1,1 MB |
| `kortfordeling-452.html` | kortfordeling, turnering 452 | 183 kB |
| `personligt-regnskab-452.html` | personligt regnskab, turnering 452, par 1 | 149 kB |

- Siderne er ikke dem, specen nævner (turnering 3252, par 11): Frank sendte to andre adresser, og de er brugt.
- **XML-filen kan ikke hentes direkte.** `2151/MT450GT714.XML` gav 404 på alle prøvede stier. Vindue 1a skal læse HTML'en.
- Adresserne kræver flere felter end `filename`: `tournament`, `section`, `round` og `half`, og personligt regnskab bruger `pairno` (ikke `selectedpair`).
- Hvert spil har et link til Bridge Solver med alle fire hænder i adressen (`north=…&east=…&south=…&west=…`, `dealer`, `vul`). Det er den nemmeste vej til hænderne.
- Spil 1 fra bordresultaterne gav samme DD-tabel i `endplay` som på siden, og sidens par (3NT NS+1, 430) passer med tabellen.
- Forsiden `resultater.bridge.dk/` svarer 403 uden en sti; siderne under `/template/` svarer normalt.

## Filer

- `testspil.pbn`, `solve.py`, `maerker.py`, `maal.py`
- `funktion\` (function_app.py, host.json, local.settings.json, requirements.txt, proev_funktion.py)
- `bridgedk\` (de fem gemte sider)
- `venv\` og `py312\` (bærbar Python 3.12 fra NuGet, fordi pc'en kun har Python 3.14, som `endplay` ikke har hjul til)
- `lektioner-tekst\` (tekstudtræk af lektionerne, kun til at finde spillene)
