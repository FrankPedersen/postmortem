/**
 * Alle appens tekster ét sted (SPEC-postmortem-1c-app.md: kun dansk i første udgave, så engelsk kan komme senere).
 * Teksterne følger husets ord og beskrivende form (../CLAUDE.md); knapper og links må stå i bydeform. `**fed**` og
 * `` `kode` `` i guiden vises som fed skrift og kode.
 */
import type { Faktor, Plads, Retning } from './typer';

export const T = {
  app: 'Post Mortem',
  brand: 'Kontraktbridge',

  start: {
    titel: 'Post Mortem',
    intro:
      'Med et link fra resultater.bridge.dk bliver klubaftenens spil gennemgået: hvad der kunne vindes med åbne kort, og hvor pointene gik tabt.',
    label: 'Link til resultatsiden',
    pladsholder: 'https://resultater.bridge.dk/template/…',
    hjaelp: 'Bordresultater (holdturnering) eller Personligt regnskab (parturnering).',
    knap: 'Analysér',
    regner: 'Regner aftenens spil …',
    guideTitel: 'Sådan finder du linket',
    guideMaerke: 'Guide',
    trin: [
      'Linket findes på **resultater.bridge.dk** under klubben og turneringen.',
      'Siden er **Bordresultater** for jeres hold eller **Personligt regnskab** for jeres par.',
      'Hele adressen fra adresselinjen (linjen med `filename=…`) kopieres og sættes ind ovenfor.',
    ],
    eksempelTitel: 'Adresselinjen ser sådan ud',
    eksempelFoer: 'resultater.bridge.dk/template/personligt_regnskab.php?',
    eksempelFed: 'filename=1111/MT3252…',
    eksempelEfter: '&pairno=11',
    // Det, rådene gælder, og det, de ikke finder (SPEC-postmortem-1b-maerker.md, Kendte begrænsninger).
    raadTitel: 'Sådan læses rådene',
    raadMaerke: 'Råd',
    raadPunkter: [
      'Rådene gælder den bedste linje efter udspillet, ikke det, der blev spillet. Spilføringen kort for kort står ikke på bridge.dk.',
      'Alt er regnet med åbne kort: en skvis eller et indspil er med, når det er den eneste vej til stikket. Ved bordet kan en kipning være lige så god.',
      'Skvis og indspil findes i de sidste seks stik; det, der afgøres tidligere, findes ikke. Et indspil, der kun er nødvendigt, fordi spilfører mangler en indgang, findes ikke.',
      'Linjen er én af flere rigtige. Nøglebeslutningerne er de kort, hvor kun én mulighed holder stikkene.',
      'Står udspillet forkert på bridge.dk, bruger analysen det bedste udspil.',
    ],
    lagring:
      'Siden hentes én gang. Kun spil, kontrakter og tal gemmes, ingen navne. Appen gemmer ikke dine aftener; makker indsætter samme link. Din IP-adresse gemmes i højst 20 minutter som en kode, der ikke kan føres tilbage til adressen uden en hemmelig nøgle, for at begrænse antallet af analyser.',
  },

  fejl: {
    tomt: 'Linket mangler.',
    ikkeBridgeDk: 'Det er ikke et link fra resultater.bridge.dk',
    forMange: 'For mange analyser lige nu. Prøv igen om lidt.',
    net: 'Analysen kunne ikke hentes lige nu. Prøv igen om lidt.',
  },

  hold: {
    titel: 'Jeres hold',
    holdSpm: 'Hvilket hold spillede I på?',
    retningSpm: 'Sad I Nord–Syd eller Øst–Vest?',
    bord: (n: number) => `Bord ${n}`,
    andetHold: 'Et andet hold',
  },

  aften: {
    tilbage: 'Tilbage til start',
    form: { par: 'Parturnering', hold: 'Holdturnering' },
    skala: { matchpoint: 'matchpoint', imp: 'imp' },
    par: (nummer: number, antal: number) => `Par ${nummer} · ${antal} spil · `,
    parPoint: (point: string, top: string) => ` (${point} af ${top} point)`,
    hold: (navn: string, bord: number, retning: string, antal: number) => `${navn} · bord ${bord}, ${retning} · ${antal} spil · `,
    holdUdenNavn: (bord: number, retning: string, antal: number) => `Bord ${bord}, ${retning} · ${antal} spil · `,
    imp: (imp: string) => `${imp} imp`,
    modAndetBord: ' mod jeres andet bord',
    faktorTitel: 'Hvor gik pointene?',
    faktorEnhed: { par: 'point mod middel', hold: 'imp' },
    iAlt: { par: 'I alt mod middel', hold: 'I alt' },
    herafFejl: 'Heraf modpartens fejl',
    stoersteTitel: 'Største forbedring',
    stoerste: {
      meldinger: (n: string, enhed: string) => `Meldingerne kostede ${n} ${enhed} i forhold til par.`,
      spilfoering: (n: string, enhed: string) => `Spilføringen kostede ${n} ${enhed} mod det, der kunne vindes med åbne kort.`,
      modspil: (n: string, enhed: string) => `Modspillet kostede ${n} ${enhed} mod det, der kunne vindes med åbne kort.`,
      ingen: 'Hverken meldinger, spilføring eller modspil kostede point i aften.',
    },
    enhed: { par: 'point', hold: 'imp' },
    note: 'Alle fire tal er regnet dobbeltdummy: det, der kunne vindes med åbne kort. Held og uheld er det, feltet gjorde anderledes, uden at I gjorde noget forkert.',
    spillene: 'Spillene',
    spilleneHint: 'Hele rækken er et link.',
    filtre: 'Filter',
    alle: (n: number) => `Alle ${n}`,
    tabte: (n: number) => `Tabte point · ${n}`,
    ingenTabte: 'Ingen spil kostede point.',
    linje: (spilfoerer: string, kontrakt: string, udspil: string, stik: number, score: string) =>
      `${spilfoerer} ${kontrakt} · udspil ${udspil} · ${stik} stik · ${score}`,
    linjeUdenUdspil: (spilfoerer: string, kontrakt: string, stik: number, score: string) =>
      `${spilfoerer} ${kontrakt} · ${stik} stik · ${score}`,
    pasLinje: 'Pas hele vejen rundt',
    ikkeSpillet: 'Ikke spillet ved jeres bord',
    // Et spil, hvor bridge.dk har justeret scoren ved jeres bord (fx "M"): ingen kontrakt, men bridge.dk's point.
    justeret: 'Justeret score',
    // Parpointene for spillet under procenten i rækken (SPEC-postmortem-1d-point.md).
    spilPoint: (point: string) => `${point} point`,
    spilLink: (n: number) => `Spil ${n}`,
  },

  maerke: {
    meldinger: (kontrakt: string) => `Meldinger: ${kontrakt} var bedre`,
    spilfoering: (stik: string) => `Spilføring ${stik} stik`,
    udspil: (stik: string) => `Udspil ${stik} stik`,
    modspil: (stik: string) => `Modspil ${stik} stik`,
    modpartensFejl: (stik: string) => `Modpartens fejl ${stik} stik`,
    bedsteKontrakt: 'Bedste kontrakt',
    bedsteModspil: 'Bedste modspil',
    ikkeSpillet: 'Ikke spillet',
  },

  // Vindue 1b, del B: teknikkerne i aftenens spil og mærkerne Skvis mulig og Indspil muligt.
  teknik: {
    kortTitel: 'Teknikker i aftenens spil',
    kortHint: 'mulige med åbne kort',
    navn: { skvis: 'Skvis', indspil: 'Indspil' },
    taget: 'Taget ved jeres bord',
    tagetTal: (taget: number, af: number) => `${taget} af ${af}`,
    note: 'Mærkerne gælder den bedste linje efter udspillet. En skvis eller et indspil er med, når det er nødvendigt i de sidste seks stik.',
    ingen: 'Ingen af aftenens spil krævede en skvis eller et indspil i de sidste seks stik.',
    filter: { skvis: (n: number) => `Skvis · ${n}`, indspil: (n: number) => `Indspil · ${n}` },
    maerke: { skvis: 'Skvis mulig', indspil: 'Indspil muligt' },
    modJer: ' mod jer',
    medStik: (maerke: string, stik: number) => `${maerke} · stik ${stik}`,
  },

  // Analysevinduets to afsnit med råd. Funktionen sender felter; sætningerne skrives her.
  raad: {
    spilfoering: 'Råd til spilføringen',
    // Var parret i modspil, er det modpartens spilføring (Franks rettelse 14. november 2026).
    spilfoeringModparten: 'Spilførerens spil (modparten)',
    modspil: 'Råd til modspillet',
    intro: 'Den bedste linje efter udspillet, kort for kort, hvor det afgør noget.',
    introModspil: (stik: number) => `Det bedste modspil holder spilfører på ${stik} stik.`,
    iModspil: 'I var i modspil',
    andreIModspil: (retning: string) => `${retning} i modspil`,
    noegle: 'Nøglebeslutninger',
    stik: (n: number) => `Stik ${n}`,
    udspil: 'Udspil',
    fra: (kort: string, plads: string) => `${kort} fra ${plads}`,
    bordet: ' (bordet)',
    holder: (dd: number) => ` holder ${dd} stik.`,
    holderModspil: (dd: number) => ` holder spilfører på ${dd} stik.`,
    giver: (kort: string, dd: number) => `${kort} giver ${dd} stik`,
    giverModspil: (kort: string, dd: number) => `${kort} giver spilfører ${dd} stik`,
    tag: { skvis: 'skviskortet', indspil: 'indspilskortet', taelling: 'tællingen rettes' },
    udspilKoster: (pris: number, efter: number, bedste: number) =>
      ` koster ${pris} stik: spilfører har ${efter} stik efter udspillet og ${bedste} efter det bedste.`,
    udspilGodt: (efter: number) => ` er blandt de bedste udspil: spilfører har ${efter} stik.`,
    udspilForkert: (bedste: string) => `Udspillet står forkert på bridge.dk; analysen bruger det bedste udspil (${bedste}).`,
    udspilMangler: (bedste: string) => `Udspillet står ikke på bridge.dk; analysen bruger det bedste udspil (${bedste}).`,
    bedsteUdspil: (liste: string) => `Bedste udspil: ${liste}.`,
    // Højst fire udspil vises; resten tælles.
    ogAndre: (n: number) => (n === 1 ? ' og 1 andet' : ` og ${n} andre`),
    // Hvem teknikken er mod, i overskriften og i modspillets afsnit.
    mod: {
      plads: (navn: string) => navn,
      jer: (navn: string) => `jer (${navn})`,
      begge: 'begge modspillere',
      jerBegge: 'jer begge',
      enAfDem: 'en af modspillerne',
      enAfJer: 'en af jer',
    },
    titel: {
      skvis: (hvem: string) => `Skvis mod ${hvem}`,
      dobbeltskvis: (hvem: string) => `Dobbeltskvis mod ${hvem}`,
      indspil: (hvem: string) => `Indspil mod ${hvem}`,
    },
    uden: {
      skvis: (uden: number, med: number) => `Uden skvisen ${uden} stik, med ${med}.`,
      indspil: (uden: number, med: number) => `Uden indspillet ${uden} stik, med ${med}.`,
    },
    skviskort: (kort: string, stik: number, fra: string) => `Skviskortet er ${kort} i stik ${stik}, spillet fra ${fra}.`,
    skvisFarver: (navn: string, farver: string) => ` ${navn} kan ikke bekende og har ${farver} tilbage.`,
    skvisFarverFlere: (farver: string) => ` Modspillerne kan ikke bekende og har ${farver} tilbage.`,
    indspilskort: (kort: string, stik: number, fra: string, vinder: string) =>
      `Indspilskortet er ${kort} i stik ${stik}, spillet fra ${fra}. ${vinder} vinder stikket og skal spille ud.`,
    kastInd: (navn: string) => `Kast-ind-skvis: ${navn} må først kaste et kort, han har brug for, og sættes derefter ind.`,
    modHvem: {
      skvis: (hvem: string) => `Skvisen er mod ${hvem}. Det bedste modspil kan ikke forhindre den.`,
      indspil: (hvem: string) => `Indspillet er mod ${hvem}. Det bedste modspil kan ikke forhindre det.`,
    },
    stilling: (stik: number) => `Stillingen før stik ${stik}`,
    spiller: (plads: string, kort: string) => `${plads} spiller ${kort}`,
    spotTitel: 'Sådan spotter du den',
    // Faste tekster pr. teknik med ordbogens ord: indspil og skvis er former for slutspil.
    spot: {
      skvis:
        'En skvis er en form for slutspil: en modspiller må kaste et kort, han ikke kan undvære. Den viser sig, når én modspiller vogter to farver alene, og der mangler ét stik. Vinderne i de andre farver indkasseres, til han ikke har flere frie kort.',
      dobbeltskvis:
        'En dobbeltskvis er en form for slutspil: hver modspiller vogter sin egen farve, og begge vogter en tredje. Når vinderne i den fjerde farve indkasseres, må de efter tur slippe den fælles farve.',
      indspil:
        'Et indspil er en form for slutspil: en modspiller sættes ind og må spille ud til spilførers fordel, fx op i en gaffel eller til dobbeltrenonce. Det viser sig, når en modspiller kun har skadelige udspil tilbage. Hans udgange fjernes først, og så får han stikket.',
      kastInd:
        'En kast-ind-skvis er skvis og indspil efter hinanden. Modspilleren kan ikke både beholde sine udgange og sin garde: han må kaste noget af det og sættes så ind.',
    },
    ordbog: (navn: string) => `${navn} i ordbogen`,
    ordbogNavn: { skvis: 'Skvis', indspil: 'Indspil', slutspil: 'Slutspil' },
    ordbogLink: { skvis: '/ordbog/#skvis', indspil: '/ordbog/#indspil', slutspil: '/ordbog/#slutspil' },
    ikkeRegnet: 'Rådene kunne ikke regnes for dette spil.',
  },

  spil: {
    tilbage: 'Tilbage til oversigten',
    forrige: 'Forrige spil',
    naeste: 'Næste spil',
    titel: (n: number) => `Spil ${n}`,
    under: (pos: number, antal: number, giver: string, zone: string) => `${pos} af ${antal} · Giver ${giver} · ${zone}`,
    bordet: 'Bordet',
    hp: (n: number) => `${n} hp`,
    spilfoerer: 'spilfører',
    udspil: (u: string) => `udspil ${u}`,
    vedBordet: 'Ved jeres bord',
    kontrakt: 'Kontrakt',
    udspilLabel: 'Udspil',
    stik: 'Stik',
    score: 'Score',
    forkert: '(står forkert på bridge.dk)',
    // I flisen Udspil under Ved jeres bord: "♥10*" og fodnoten på en linje under fliserne (Franks rettelse 14. november 2026).
    stjerne: '*',
    forkertFodnote: '*Udspillet står forkert på bridge.dk',
    forkertUdspil: (u: string) => `${u} (står forkert på bridge.dk)`,
    point: (point: string, top: string) => `${point} af ${top} point`,
    impMod: 'Imp mod jeres andet bord',
    andetBord: (score: string) => `Jeres andet bord: ${score}`,
    feltet: 'Feltet',
    jer: '(jer)',
    gange: (n: number) => `×${n}`,
    ikkeSpillet: 'Ikke spillet ved jeres bord',
    dd: 'Dobbeltdummy',
    ddHint: 'stik med åbne kort',
    ddTabel: 'Stik med åbne kort',
    ddAfvigelse: 'bridge.dk viser en anden tabel; tallene her er regnet med DDS.',
    par: 'Par',
    parKontrakter: (k: string, score: string) => `${k}, ${score}`,
    eller: ' eller ',
    maxFoer: 'Max før udspil',
    maxEfter: (u: string) => `Max efter ${u}`,
    maxEfterUkendt: 'Max efter udspil',
    nStik: (n: number) => `${n} stik`,
    ukendt: 'ukendt udspil',
    faktorTitel: 'Hvor gik pointene?',
    ikkeRelevant: '–',
    note: 'Dobbeltdummy regnes med DDS (Apache 2.0). Spilføringen kort for kort kendes ikke fra bridge.dk. Rådene gælder den bedste linje efter det faktiske udspil, ikke det, der blev spillet. Skvis og indspil findes i de sidste seks stik.',
  },

  // ⓘ ved "Hvor gik pointene?" på oversigten og i analysevinduet, med samme tekst begge steder
  // (SPEC-postmortem-1d-point.md, Franks svar 17. nov. 2026).
  pointInfo: {
    label: 'Hjælp: Hvor gik pointene?',
    // Forslaget i specen med Franks sætning om omregning.
    par: {
      tekst:
        '**Point** er parpoint. På hvert spil får I 2 point for hvert par i feltet, I slår, og 1 for hvert, I deler med. Er et spil spillet færre gange, omregnes pointene, så alle spil tæller lige meget, som hos bridge.dk. **Middel** er halvdelen af det mulige, altså 50 %. Tallene viser, hvor mange point I lå over eller under middel, og hvad der flyttede dem:',
      punkter: [
        '**Meldinger (begge sider):** forskellen mellem den spillede kontrakt og det bedste, der kunne meldes med åbne kort.',
        '**Spilføring** og **Modspil:** stik, I tabte i forhold til åbne kort. De er nul eller negative.',
        '**Held og uheld:** resten, altså det, feltet gjorde anderledes, uden at I gjorde noget forkert. Modpartens fejl tæller med her.',
      ],
      slut: 'Summen er jeres point mod middel.',
    },
    // Franks tekst ordret.
    hold: {
      tekst:
        '**Point** er imp. På hvert spil lægges jeres score og holdkammeraternes score ved det andet bord sammen, og summen omregnes til imp. Tallene viser, hvor mange imp I vandt eller tabte, og hvad der flyttede dem: Meldinger, Spilføring og Modspil er regnet med åbne kort som ved parturnering. Held og uheld er resten, mest resultatet ved det andet bord, og holdkammeraternes fejl og gode spil tæller med her. Summen er jeres imp.',
      punkter: [],
      slut: '',
    },
  } satisfies { label: string } & Record<'par' | 'hold', { tekst: string; punkter: string[]; slut: string }>,

  // SPEC-postmortem-2a-vaerd-at-se-paa.md: knapperne til at dele aftenen (skærm 1), valget under Udskriv og mailen.
  del: {
    gruppe: 'Del aftenen',
    udskriv: 'Udskriv',
    mail: 'Mail',
    kopier: 'Kopiér',
    hvilke: 'Hvilke spil?',
    vaerd: (n: number) => `Spil værd at se på (${n})`,
    alle: (n: number) => `Alle ${n} spil`,
    udskrivNu: 'Udskriv nu',
    kopieret: 'Gennemgangen er kopieret.',
    ikkeKopieret: 'Teksten kunne ikke kopieres. Den står i vinduet Mail og kan markeres dér.',
  },

  // Kortet "Spil værd at se på" (afsnit 1, Franks svar 2, 17. nov. 2026).
  vaerd: {
    titel: 'Spil værd at se på',
    antal: (vist: number, af: number) => `${vist} af ${af}`,
    intro: 'Sorteret efter, hvor meget jeres egne beslutninger kostede. Beslutningen bedømmes, ikke kun resultatet.',
    ingen: 'Ingen af aftenens spil kostede noget på jeres egne beslutninger.',
    visAlle: (n: number) => `Vis alle (${n})`,
    visFaerre: 'Vis færre',
    uheldige: 'Uheldige, ingen fejl: spil ',
    hvorfor: 'Hvorfor er et spil med?',
    regel: {
      par: [
        'Listen viser de 8 spil, hvor jeres egne beslutninger kostede mest: den negative del af meldinger, spilføring og modspil.',
        'Under "Vis alle" står også de andre spil, hvor de kostede 2 point eller mere, og spil med udgang eller slem misset eller meldt uden dækning, strafdobling, et udspil, der kostede et stik, eller et heldigt resultat.',
        'Heldigt er mindst 50 %, selv om jeres egne beslutninger kostede point. Uheldige spil, under 50 % uden egne fejl, står på én linje under listen.',
        'Bund, top og anden kontrakt end feltet er kun ekstra mærker: de vises, men bringer ikke et spil med.',
      ],
      hold: [
        'Listen viser de 8 spil, hvor jeres egne beslutninger kostede mest: den negative del af meldinger, spilføring og modspil.',
        'Under "Vis alle" står også de andre spil, hvor de kostede 2 imp eller mere, og spil med udgang eller slem misset eller meldt uden dækning, strafdobling, et udspil, der kostede et stik, eller et heldigt resultat.',
        'Heldigt er 0 imp eller mere, selv om jeres egne beslutninger kostede imp. Uheldige spil, under 0 imp uden egne fejl, står på én linje under listen.',
        'Anden kontrakt end feltet er kun et ekstra mærke: det vises, men bringer ikke et spil med. Bund og top findes ikke ved holdturnering.',
      ],
    } satisfies Record<'par' | 'hold', string[]>,
    filter: (n: number) => `Værd at se på · ${n}`,
    linje: (spilfoerer: string, kontrakt: string, stik: number, score: string) => `${spilfoerer} ${kontrakt} · ${stik} stik · ${score}`,
    imp: (imp: string) => `${imp} imp`,
    enhed: { par: 'point', hold: 'imp' },
    maerke: {
      bund: 'Bund',
      top: 'Top',
      udgangMisset: 'Udgang misset',
      slemMisset: 'Slem misset',
      udgangUdenDaekning: 'Udgang meldt uden dækning',
      slemUdenDaekning: 'Slem meldt uden dækning',
      strafdobling: 'Strafdobling',
      udspil: (stik: number) => `Udspillet kostede ${stik} stik`,
      meldinger: (tal: string, enhed: string) => `Meldinger −${tal} ${enhed}`,
      spilfoering: (stik: number) => `Spilføring −${stik} stik`,
      modspil: (stik: number) => `Modspil −${stik} stik`,
      andenKontrakt: 'Anden kontrakt end feltet',
      heldigt: (grund: string) => `Heldigt: ${grund}`,
      uheldigt: (grund: string) => `Uheldigt: ${grund}`,
    },
    // Grunden i Heldigt og Uheldigt (forslag 10): resultatet først, så spillets andre mærker.
    grund: { top: 'top', godt: 'godt resultat', bund: 'bund', daarligt: 'dårligt resultat', ingenFejl: 'ingen fejl' },
  },

  // Kortet Meldesamtalen øverst i analysevinduet (afsnit 2). Ja, måske og nej følger reglen i specen (stik med åbne
  // kort og feltet), ikke mock-up'ens tekster om sidning og kipning (Franks svar 17. nov. 2026).
  meldesamtale: {
    titel: 'Meldesamtalen',
    navn: { fit: 'Fit', udgang: 'Udgang', slem: 'Slem' },
    ord: { ja: 'Ja', maaske: 'Måske', nej: 'Nej' },
    symbol: { ja: '✓', maaske: '~', nej: '✗' },
    ingen: '–',
    kunVedUdgang: 'kun ved udgang',
    fold: (navn: string, ord: string) => `${navn}: ${ord}`,
    fitFelt: (kort: number, farve: string) => `${kort} ${farve}`,
    fitJa: (kort: number, farve: string, fordeling: string) => `${kort} ${farve} (${fordeling}).`,
    fitNej: (kort: number, farve: string, fordeling: string) => `${kort} ${farve} (${fordeling}): ingen farve med 8 kort.`,
    stik: (n: number, benaevnelser: string) => `${n} stik i ${benaevnelser}`,
    borde: (borde: number, af: number) => `${borde} af ${af} borde`,
    andetBord: 'det andet bord',
    ikkeAndetBord: 'ikke det andet bord',
    niveau: { udgang: 'udgang', slem: 'slem' },
    facit: (stik: string, borde: string, niveau: string) => `Facit: ${stik} med åbne kort; ${borde} meldte ${niveau}.`,
    facitHold: (stik: string, var_: boolean, niveau: string) =>
      `Facit: ${stik} med åbne kort; det andet bord meldte ${var_ ? '' : 'ikke '}${niveau}.`,
    benaevnelse: { NT: 'sans', S: 'spar', H: 'hjerter', D: 'ruder', C: 'klør' },
    // "Spørg hinanden" er afsnittets navn i specen og står på bydeformtestens UNDTAGELSER.
    spoergTitel: 'Spørg hinanden',
    // Fra tjeklistens punkt 2–3 (specens afsnit 2) med husets ord: "et muligt majorfit".
    spoerg: {
      fit: ['Undersøgte vi majorfarverne?', 'Viste vi vores længder?', 'Stoppede vi i 3NT før et muligt majorfit?'],
      udgangMaaske: ['Inviterede vi, da vi skulle?', 'Passede en af os for tidligt?'],
      udgangUden: ['Meldte vi udgang uden nok information?'],
      slemMaaske: ['Undersøgte vi slem?', 'Havde vi styr på esser og nøglekort?', 'Var 6NT eller slem i farve rigtigst ved parturnering?'],
      slemUden: ['Pressede vi for hårdt?', 'Havde vi kontrol i sidefarverne?'],
    },
    overstik: 'Var overstikket afgørende?',
    ejer: 'Hvem ejede spillet?',
    side: { jer: 'I', modparten: 'Modparten' },
    konkurrence: (side: string) => `${side} (konkurrence)`,
    ingenKonkurrence: (side: string) => `${side} (ingen konkurrence)`,
    ingenEjer: 'Ingen (par er pas)',
    trumf: (jer: string, modparten: string, sum: number) => `Trumf: jer ${jer}, modparten ${modparten}, i alt ${sum} (loven om totale stik).`,
    // Specens "spil selv / forsvar mod X" i beskrivende form (husets regel).
    bedstSelv: (kontrakter: string) => ` Bedst for jer: selv at spille ${kontrakter}.`,
    bedstForsvar: (kontrakter: string) => ` Bedst for jer: at forsvare mod ${kontrakter}.`,
    // Kort form til mailen og udskriften: "Fit: ja (9♥). Udgang: ja. Slem: måske, 12 stik i sans og hjerter; 0 af 7 borde."
    kortFit: (ord: string, kort: number, symbol: string) => `Fit: ${ord} (${kort}${symbol}).`,
    kortNiveau: (navn: string, ord: string, grund: string) => `${navn}: ${ord}${grund ? `, ${grund}` : ''}.`,
  },

  // Udskriften (afsnit 3, skærm 4): side 1 og én side pr. spil.
  udskrift: {
    top: (dato: string, navn: string) => `Post Mortem · ${dato} · ${navn}`,
    side: (n: number, af: number) => `Side ${n} af ${af}`,
    titel: 'Gennemgang af aftenen',
    spil: (n: number) => `Spil ${n}`,
    point: (point: string, top: string) => ` · ${point} af ${top} point`,
    vedBordet: 'Ved jeres bord:',
    feltet: 'Feltet:',
    aabneKort: 'Med åbne kort:',
    par: (par: string, score: string) => `par ${par}, ${score}.`,
    faktorer: 'Hvor gik pointene?',
    spoerg: 'Spørg hinanden:',
    beslutning: 'Beslutning eller resultat?',
    beslutninger: ['Rigtig, godt', 'Rigtig, dårligt', 'Forkert, godt', 'Forkert, dårligt'],
    aftale: 'Aftalestatus',
    aftaler: ['Klar aftale', 'Uklar aftale', 'Ingen aftale'],
    aarsag: 'Primær årsag:',
    naesteGang: 'Næste gang gør vi … / ny aftale',
    kommentarer: 'Kommentarer',
    fod: 'www.kontraktbridge.dk/postmortem/ · ingen navne',
    giver: (plads: string) => `Giver ${plads}`,
    boks: '☐',
  },

  // Vinduet "Aftenen til makker" (`#/mail`, skærm 3; mock-up'ens "Send aftenen til makker" i beskrivende form) og
  // teksten, der kopieres og sendes (afsnit 4).
  mail: {
    tilbage: 'Tilbage til oversigten',
    titel: 'Aftenen til makker',
    kopier: '1. Kopiér gennemgangen',
    aabn: '2. Åbn mail, og sæt ind',
    hjaelp: (emne: string) =>
      `Mailen åbner med emnet "${emne}". Teksten sættes ind i mailen. På telefonen åbner del-knappen i stedet, og teksten kommer med af sig selv.`,
    forhaand: 'Sådan ser teksten ud',
    note: 'Ingen navne, kun "I" og "modparten". Makker skriver under "Kommentar:" og svarer på mailen.',
    emnePar: (dato: string, procent: string) => `Post Mortem: ${dato}, ${procent} %`,
    emneHold: (dato: string, imp: string) => `Post Mortem: ${dato}, ${imp} imp`,
    krop: 'Gennemgangen er kopieret og sættes ind her.',
  },
  gennemgang: {
    titel: (dato: string) => `Post Mortem · ${dato}`,
    aften: (navn: string, antal: number) => `${navn} · ${antal} spil`,
    bord: (bord: number, retning: string, antal: number) => `Bord ${bord}, ${retning} · ${antal} spil`,
    resultatPar: (procent: string, point: string, top: string) => `Resultat: ${procent} % (${point} af ${top} point)`,
    resultatHold: (imp: string) => `Resultat: ${imp} imp mod jeres andet bord`,
    faktorer: { par: 'Hvor gik pointene? (mod middel)', hold: 'Hvor gik pointene? (imp)' },
    faktorNavn: { meldinger: 'Meldinger', spilfoering: 'Spilføring', modspil: 'Modspil', held: 'Held og uheld' } satisfies Record<Faktor, string>,
    vaerd: (n: number) => `SPIL VÆRD AT SE PÅ (${n})`,
    alle: (n: number) => `ALLE SPIL (${n})`,
    spil: (n: number, linje: string, resultat: string) => `Spil ${n} · ${linje} · ${resultat}`,
    kommentar: 'Kommentar:',
    uheldige: (numre: string) => `Uheldige, ingen fejl: spil ${numre}`,
    adresse: 'www.kontraktbridge.dk/postmortem/',
  },

  // Én linje pr. faktor i analysevinduet.
  forklaring: {
    meldingerBedre: (par: string) => `${par} var bedre.`,
    meldingerSom: 'Kontrakten giver det samme som par.',
    meldingerOver: 'Kontrakten giver mere end par; modparten kunne have gjort det bedre i meldingerne.',
    pas: 'Spillet blev meldt pas.',
    spilfoering: (kunne: number, tog: number) => `${kunne} stik kunne tages efter udspillet; I tog ${tog}.`,
    spilfoeringUkendt: (kunne: number, tog: number) => `${kunne} stik kunne tages med åbne kort; I tog ${tog}.`,
    iModspil: 'Modparten var spilfører.',
    modspil: (foer: number, efter: number, tog: number) =>
      `Med åbne kort ${foer} stik til spilfører før udspillet og ${efter} efter; spilfører tog ${tog}.`,
    modspilUkendt: (foer: number, tog: number) => `Med åbne kort ${foer} stik til spilfører; spilfører tog ${tog}.`,
    iSpilfoering: 'I var spilfører.',
    heldPar: { plus: 'Feltet gjorde det dårligere end par, og det gav jer point.', minus: 'Feltet gjorde det bedre end par, og det kostede jer point.', nul: 'Feltet gjorde det som par.' },
    heldHold: { plus: 'Jeres andet bord gjorde det bedre end par.', minus: 'Jeres andet bord gjorde det dårligere end par.', nul: 'Jeres andet bord gjorde det som par.' },
    udspilHjalp: ' Modpartens udspil gav jer et stik.',
    flyttet: ' Modpartens fejl står under Held og uheld.',
    fejlSpilfoerer: (tog: number, kunne: number, point: string) =>
      ` Modpartens fejl: spilfører tog ${tog} stik, hvor ${kunne} kunne tages (${point}).`,
    fejlModspil: (tog: number, kunne: number, point: string) =>
      ` Modpartens fejl: I tog ${tog} stik, hvor modspillet kunne holde jer på ${kunne} (${point}).`,
  },

  faktor: { meldinger: 'Meldinger (begge sider)', spilfoering: 'Spilføring', modspil: 'Modspil', held: 'Held og uheld' } satisfies Record<Faktor, string>,
  plads: { N: 'Nord', E: 'Øst', S: 'Syd', W: 'Vest' } satisfies Record<Plads, string>,
  pladsKort: { N: 'N', E: 'Ø', S: 'S', W: 'V' } satisfies Record<Plads, string>,
  retning: { NS: 'Nord–Syd', OV: 'Øst–Vest' } satisfies Record<Retning, string>,
  retningKort: { NS: 'N–S', OV: 'Ø–V', EW: 'Ø–V' } as Record<string, string>,
  zone: { None: 'Ingen i zonen', NS: 'N–S i zonen', EW: 'Ø–V i zonen', All: 'Alle i zonen' },
  farveNavn: { S: 'spar', H: 'hjerter', D: 'ruder', C: 'klør' },
  renonce: 'renonce',
  og: 'og',
  doblet: 'D',
  redoblet: 'RD',
  pas: 'Pas',
  maaneder: ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'],

  sidefod: {
    om: 'Gratis bridgetræning i browseren. Lavet af Frank Pedersen.',
    kontakt: 'Om mig og kontakt',
    traenere: 'Trænere',
    opslag: 'Opslag',
    traenerLinks: [
      { href: '/konventionstraener/', titel: 'Konventionstræner' },
      { href: '/fordelingstraeneren/#fordeling', titel: 'Fordeling' },
      { href: '/fordelingstraeneren/#pointregnskab', titel: 'Pointregnskab' },
      { href: '/fordelingstraeneren/#farvebehandling', titel: 'Farvebehandling' },
      { href: '/fordelingstraeneren/#haandevaluering', titel: 'Håndevaluering' },
      { href: '/postmortem/', titel: 'Post Mortem' },
    ],
    opslagLinks: [
      { href: '/fordelingstraeneren/#analyse', titel: 'Analyse' },
      { href: '/ordbog/', titel: 'Bridgeordbog' },
      { href: '/scoring/', titel: 'Scoring i bridge' },
    ],
    legal: '© 2026 Frank Pedersen',
    legalEkstra: ' · Gratis bridgetræning i browseren',
  },
};
