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
