# Post Mortem

Post Mortem (PM) er makkerparrets gennemgang af egne spil bagefter. Brugeren indsætter et link fra resultater.bridge.dk, og appen viser for hvert spil, hvad der kunne vindes dobbeltdummy, og hvor parret vandt eller tabte i forhold til feltet: meldinger, spilføring, modspil og held.

Appen kommer på www.kontraktbridge.dk/postmortem/. Al beregning sker i en Azure Function (`api/`); appen viser kun svaret.

Planen står i [docs/specs/PLAN-postmortem.md](docs/specs/PLAN-postmortem.md), og hvert trin har sin egen spec i `docs/specs/`.

## Licenser

Dobbeltdummy-beregningen bruger DDS af Bo Haglund og Soren Hein (Apache 2.0) gennem endplay af Dominic Price (MIT).
