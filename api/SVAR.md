# Svaret fra `POST /api/analyse`

Funktionen tager et link fra resultater.bridge.dk og svarer med ét JSON-dokument. Felterne nedenfor er hele svaret: `tests/test_svar.py` læser tabellerne i denne fil og fejler, hvis svaret har et felt, der ikke står her, eller mangler et, der gør.

Fælles koder: pladser er `N`, `E`, `S`, `W` (som i PBN), retninger `NS` og `OV`, farver `C`, `D`, `H`, `S`, `NT`, zoner `None`, `NS`, `EW`, `All`. Kontrakter skrives `4H`, `3NTX`, `5DXX` eller `Pas`, udspil `D7` (farve og rang, `T` for 10). Alle scorer og point er set fra parret eller holdet, der analyseres, medmindre feltet hedder `…NS`.

## Forespørgslen

```json
{ "url": "https://resultater.bridge.dk/template/personligt_regnskab.php?filename=2151/MT452GT720.XML&tournament=452&section=1&pairno=1" }
```

- **Personligt regnskab** (`personligt_regnskab.php`, parturnering): parret er `pairno`. Funktionen henter selv kortfordelingen og spilresultaterne for samme turnering og sektion.
- **Bordresultater** (`multihold_bordresultater.php`, holdturnering): første kald giver holdlisten (`vaelg`). Andet kald med `"hold": "<id>"` fra listen giver analysen. Et valg er et hold ved et bord, fordi holdets to par sidder ved hver sit bord.

## Fejl

Status og `{ "fejl": "…" }`:

| Status | Tekst | Når |
| --- | --- | --- |
| 400 | Det er ikke et link fra resultater.bridge.dk | adressen er ikke `https://resultater.bridge.dk/…`, eller kroppen er ikke JSON med `url` |
| 400 | Brug Bordresultater eller Personligt regnskab | en anden side fra resultater.bridge.dk |
| 400 | Holdet findes ikke på siden | `hold` er ikke et id fra holdlisten |
| 413 | Forespørgslen er for stor | kroppen er over 4 kB |
| 422 | Siden har ingen spil | siden har ingen spil (fx uden `pairno`) |
| 429 | For mange analyser lige nu. Prøv igen om lidt. | over 10 analyser fra samme IP inden for 10 minutter (holdlisten tæller ikke); med `Retry-After` i sekunder |
| 502 | bridge.dk svarer ikke lige nu | timeout, netværksfejl eller fejlsvar fra bridge.dk |

## Holdlisten

### vaelg-svar

| Felt | Type | Indhold |
| --- | --- | --- |
| `turnering` | objekt | som i analysen |
| `vaelg` | objekt | `{ "hold": [...] }` |

### vaelg.hold[]

Holdlisten er det eneste sted i svaret med navne: holdets navn (på siden holdkaptajnens).

| Felt | Type | Indhold |
| --- | --- | --- |
| `id` | tekst | fx `2-NS`: bord og retning |
| `hold` | tekst | holdets navn |
| `retning` | tekst | `NS` eller `OV` |
| `bord` | tal | bordnummer |

## Analysen

### svar

| Felt | Type | Indhold |
| --- | --- | --- |
| `turnering` | objekt | turneringen |
| `deltager` | objekt | parret eller holdet, uden navne |
| `resultat` | objekt | aftenens resultat |
| `faktorer` | objekt | de fire faktorer summeret over de spillede spil |
| `stoersteForbedring` | tekst eller null | den af `meldinger`, `spilfoering` og `modspil`, der er mest negativ; null, når ingen er negativ |
| `spil` | liste | ét objekt pr. spil |

### svar.turnering

| Felt | Type | Indhold |
| --- | --- | --- |
| `navn` | tekst | fx "Holdturnering, A-rækken" eller "Klubsølv, 04.11.2026, aften, A-rækken" |
| `titel` | tekst eller null | sidens overskrift i holdturnering (fx "… kamp 2, 1. halvleg"); null i parturnering, hvor den har navne |
| `dato` | tekst | `ÅÅÅÅ-MM-DD` |
| `form` | tekst | `par` eller `hold` |
| `skala` | tekst | `matchpoint` (par) eller `imp` (hold) |
| `top` | tal eller null | højeste point på et spil i parturnering (sidens skala, 2 pr. slået score); null i holdturnering |
| `id` | tekst | turneringens nummer på bridge.dk |
| `sektion` | tekst | sektionen |
| `runde` | tekst eller null | kampen i holdturnering |
| `halvleg` | tekst eller null | halvlegen i holdturnering |

### svar.deltager

Parturnering: `type` er `par`, og `nummer` er parnummeret. Holdturnering: `type` er `hold`, og `id`, `retning` og `bord` er valget fra holdlisten.

| Felt | Type | Indhold |
| --- | --- | --- |
| `type` | tekst | `par` eller `hold` |
| `nummer` | tal | parnummeret (kun par) |
| `id` | tekst | valget, fx `2-NS` (kun hold) |
| `retning` | tekst | `NS` eller `OV` (kun hold) |
| `bord` | tal | bordnummer (kun hold) |

### svar.resultat

| Felt | Type | Indhold |
| --- | --- | --- |
| `procent` | tal eller null | parturnering: point i alt / top i alt × 100 |
| `point` | tal eller null | parturnering: point i alt |
| `top` | tal eller null | parturnering: top i alt over de spillede spil |
| `imp` | tal eller null | holdturnering: imp i alt mod holdkammeraternes bord |

### svar.faktorer

Summen over de spillede spil af faktorerne i `svar.spil[].faktorer`.

| Felt | Type | Indhold |
| --- | --- | --- |
| `meldinger` | tal | |
| `spilfoering` | tal | |
| `modspil` | tal | |
| `held` | tal | |

### svar.spil[]

`P(S)` er pointene for scoren S: i parturnering matchpoint mod feltets faktiske scorer (§ 78A: 2 pr. dårligere score, 1 pr. lige); i holdturnering imp (§ 78B) for S plus holdkammeraternes score ved det andet bord. Middel er halvdelen af toppen i parturnering og 0 i holdturnering.

| Felt | Type | Indhold |
| --- | --- | --- |
| `nummer` | tal | spillets nummer |
| `giver` | tekst | `N`, `E`, `S` eller `W` |
| `zone` | tekst | `None`, `NS`, `EW` eller `All` |
| `haender` | objekt | `{ "N": "Q43.AJ43.AT83.A6", ... }`: ♠.♥.♦.♣ med engelske bogstaver |
| `ddTabel` | objekt | endplays DD-tabel: `{ "N": { "C": 8, "D": 8, "H": 10, "S": 8, "NT": 10 }, ... }` |
| `ddSide` | objekt eller null | DD-tabellen, som bridge.dk viser den |
| `ddAfvigelse` | sand/falsk | sand, når `ddTabel` og `ddSide` ikke er ens |
| `par` | objekt | par-scoren og par-kontrakterne |
| `retning` | tekst | parrets eller holdets retning ved bordet: `NS` eller `OV` |
| `spillet` | sand/falsk | falsk, når der ikke er et resultat ved bordet (eller ved holdkammeraternes bord); så er resten af felterne null |
| `kontrakt` | tekst eller null | kontrakten ved bordet |
| `spilfoerer` | tekst eller null | spilføreren |
| `udspil` | tekst eller null | udspillet, som siden viser det |
| `stik` | tal eller null | spilførers stik |
| `score` | tal eller null | scoren ved bordet (`S_faktisk`) |
| `point` | tal eller null | `P(S_faktisk)` |
| `top` | tal eller null | parturnering: top på spillet (2 × antal andre resultater) |
| `procent` | tal eller null | parturnering: point / top × 100 |
| `felt` | liste | de andre bordes scorer på spillet, fra højeste til laveste |
| `holdkammerater` | tal eller null | holdturnering: holdets score ved holdkammeraternes bord |
| `ddFoer` | tal eller null | spilførersidens max stik i kontrakten før udspil |
| `ddEfter` | tal eller null | spilførersidens max stik efter det faktiske udspil; null, når udspillet er ukendt |
| `scorer` | objekt eller null | de fire scorer |
| `faktorer` | objekt eller null | de fire faktorer; null, når spillet ikke er spillet |
| `modpartensFejl` | tal eller null | den del af `held`, hvor modparten spillede eller spillede modspil dårligere end med åbne kort: `max(0, P(S_faktisk) − P(S_ddEfter))`; 0 ved pas; null, når spillet ikke er spillet |
| `udspilseffekt` | objekt eller null | udspillets pris |
| `maerker` | liste | tom indtil vindue 1b (skvis, slutspil, nøglebeslutninger) |

### svar.spil[].par

| Felt | Type | Indhold |
| --- | --- | --- |
| `scoreNS` | tal | par-scoren set fra NS |
| `score` | tal | par-scoren set fra parret |
| `kontrakter` | liste | fx `["3NT NS+1"]` |

### svar.spil[].scorer

| Felt | Type | Indhold |
| --- | --- | --- |
| `faktisk` | tal | `S_faktisk`: scoren ved bordet |
| `ddEfter` | tal | `S_ddEfter`: samme kontrakt med `ddEfter` stik (med `ddFoer`, når udspillet er ukendt) |
| `ddFoer` | tal | `S_ddFoer`: samme kontrakt med `ddFoer` stik |
| `par` | tal | `S_par`: par-scoren |

### svar.spil[].faktorer

Teleskopsum: de fire lægger op til `P(S_faktisk) − middel`. Spilføring og modspil er højst 0; den positive del af `P(S_faktisk) − P(S_ddEfter)`, hvor modparten fejlede, står under held og uheld og for sig i `modpartensFejl` (SPEC-postmortem-1c-app.md, Franks godkendelse 12. november 2026).

| Felt | Type | Indhold |
| --- | --- | --- |
| `meldinger` | tal | `P(S_ddFoer) − P(S_par)` (begge sider) |
| `spilfoering` | tal | parret spilfører: `min(0, P(S_faktisk) − P(S_ddEfter))`; ellers 0 |
| `modspil` | tal | parret i modspil: `min(0, P(S_faktisk) − P(S_ddEfter))` plus udspillet `P(S_ddEfter) − P(S_ddFoer)`; ellers 0 |
| `held` | tal | `P(S_par) − middel`, plus modpartens udspil, når parret var spilfører, plus modpartens fejl (`modpartensFejl`) |

### svar.spil[].udspilseffekt

| Felt | Type | Indhold |
| --- | --- | --- |
| `point` | tal | `P(S_ddEfter) − P(S_ddFoer)` |
| `udspilAf` | tekst | `parret` eller `modparten` |
| `ukendt` | sand/falsk | sand, når siden mangler udspillet, eller kortet ikke er i udspillerens hånd; så er `point` 0 |
