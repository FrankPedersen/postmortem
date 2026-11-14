import { kort, kortGruppe, opremsning, SYMBOL } from '../format';
import { T } from '../tekster';
import type { Maerke, Noeglebeslutning, Plads, Spil, TeknikMaerke } from '../typer';
import { lagdeKortet, teknikMaerker, teknikTekst, viSpillede } from '../udledt';
import { Farver } from '../ui/Ramme';
import { Slutstilling } from '../ui/Slutstilling';

const makker = (p: Plads): Plads => ({ N: 'S', S: 'N', E: 'W', W: 'E' } as const)[p];

/** Hvem teknikken er mod: "Vest", "jer (Nord)", "begge modspillere", "en af jer". */
function modHvem(m: TeknikMaerke, modJer: boolean): string {
  if (m.mod === 'begge') return modJer ? T.raad.mod.jerBegge : T.raad.mod.begge;
  if (m.mod === 'en af dem') return modJer ? T.raad.mod.enAfJer : T.raad.mod.enAfDem;
  return modJer ? T.raad.mod.jer(T.plads[m.mod]) : T.raad.mod.plads(T.plads[m.mod]);
}

/** Én nøglebeslutning: stikket, kortet og hånden, DD-tallet og de dyreste alternativer. */
function Beslutning({ spil, n, modspil }: { spil: Spil; n: Noeglebeslutning; modspil: boolean }) {
  const bordet = !modspil && spil.spilfoerer !== null && n.haand === makker(spil.spilfoerer);
  const skvisstik = spil.teknik?.skvis?.stik ?? null;
  const tag = n.maerke === 'indspil' ? T.raad.tag.indspil : n.maerke === 'skvis' ? (n.stik === skvisstik ? T.raad.tag.skvis : T.raad.tag.taelling) : null;
  const andre = n.alternativer.map((a) => (modspil ? T.raad.giverModspil : T.raad.giver)(kortGruppe(a.kort), a.dd));
  return (
    <li>
      <span className="stik-nr">{T.raad.stik(n.stik)}</span>{' '}
      <div className="raad-linje">
        <span className="raad-tekst">
          <strong>
            <Farver>{T.raad.fra(kort(n.kort), T.plads[n.haand]) + (bordet ? T.raad.bordet : '')}</Farver>
          </strong>
          {modspil ? T.raad.holderModspil(n.dd) : T.raad.holder(n.dd)}
          {tag && (
            <>
              {' '}
              <span className="raad-tag">{tag}</span>
            </>
          )}
        </span>{' '}
        {andre.length > 0 && (
          <span className="raad-alt">
            <Farver>{`${andre.join(' · ')}.`}</Farver>
          </span>
        )}
      </div>
    </li>
  );
}

/** Et mærke i detaljer: hvem det er mod, stikkene med og uden, kortet, stillingen og "Sådan spotter du den". */
function TeknikBlok({ spil, navn, m }: { spil: Spil; navn: Maerke; m: TeknikMaerke }) {
  const modJer = !viSpillede(spil);
  const hvem = modHvem(m, modJer);
  const dobbelt = navn === 'skvis' && m.mod === 'begge';
  const titel = navn === 'indspil' ? T.raad.titel.indspil(hvem) : dobbelt ? T.raad.titel.dobbeltskvis(hvem) : T.raad.titel.skvis(hvem);
  const kastInd = !!spil.teknik?.kastIndSkvis;
  const stik = m.stik;
  const x = stik !== null ? spil.linje?.[stik - 1] : undefined;
  let kortet: string | null = null;
  if (stik !== null && m.kort && x) {
    const fra = lagdeKortet(spil, stik, m.kort) ?? x.udspiller;
    if (navn === 'skvis') {
      const farver = opremsning((m.farver ?? []).map((f) => SYMBOL[f]));
      const rest = !farver ? '' : m.mod === 'begge' || m.mod === 'en af dem' ? T.raad.skvisFarverFlere(farver) : T.raad.skvisFarver(T.plads[m.mod], farver);
      kortet = T.raad.skviskort(kort(m.kort), stik, T.plads[fra]) + rest;
    } else {
      kortet = T.raad.indspilskort(kort(m.kort), stik, T.plads[fra], T.plads[x.vinder]);
    }
  }
  const spot = kastInd ? T.raad.spot.kastInd : dobbelt ? T.raad.spot.dobbeltskvis : T.raad.spot[navn];
  return (
    <div className="teknik">
      <h3>{titel}</h3>
      <p className="teknik-tal">{T.raad.uden[navn](m.udenTeknik, m.medTeknik)}</p>
      {kortet && (
        <p>
          <Farver>{kortet}</Farver>
        </p>
      )}
      {kastInd && navn === 'indspil' && m.mod !== 'begge' && m.mod !== 'en af dem' && <p>{T.raad.kastInd(T.plads[m.mod])}</p>}
      {stik !== null && x && <Slutstilling spil={spil} stik={stik} />}
      <div className="spot">
        <span className="eyebrow">{T.raad.spotTitel}</span> <p>{spot}</p>
      </div>
    </div>
  );
}

/** Råd til spilføringen: mærkerne med stik, nøglebeslutningerne og links til ordbogen. Uden indhold vises intet. */
function Spilfoering({ spil }: { spil: Spil }) {
  const mærker = teknikMaerker(spil);
  const liste = spil.raad!.spilfoering;
  if (mærker.length === 0 && liste.length === 0) return null;
  const opslag: ('skvis' | 'indspil' | 'slutspil')[] = mærker.length ? [...mærker.map((x) => x.navn), 'slutspil'] : [];
  return (
    <section className="kort raad" aria-labelledby="h-raad-spilfoering">
      <div className="kort-hoved">
        <h2 id="h-raad-spilfoering">{viSpillede(spil) ? T.raad.spilfoering : T.raad.spilfoeringModparten}</h2>
        {mærker.length > 0 && (
          <span className="maerker">
            {mærker.map(({ navn }) => (
              <span className="teknik-maerke" key={navn}>
                {teknikTekst(spil, navn, true)}
              </span>
            ))}
          </span>
        )}
      </div>
      <p className="raad-intro">{T.raad.intro}</p>
      {mærker.map(({ navn, m }) => (
        <TeknikBlok key={navn} spil={spil} navn={navn} m={m} />
      ))}
      {liste.length > 0 && (
        <ol className="raad-liste" aria-label={T.raad.noegle}>
          {liste.map((n) => (
            <Beslutning key={`${n.stik}-${n.haand}`} spil={spil} n={n} modspil={false} />
          ))}
        </ol>
      )}
      {opslag.length > 0 && (
        <div className="ordbog-links">
          {opslag.map((o) => (
            <a key={o} href={T.raad.ordbogLink[o]}>
              {T.raad.ordbog(T.raad.ordbogNavn[o])}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

/** Råd til modspillet: udspillets pris og de bedste udspil, modspillets nøglebeslutninger, og hvem et mærke er mod. */
function Modspil({ spil }: { spil: Spil }) {
  const s = spil;
  const vi = viSpillede(s);
  const u = s.raad!.udspil;
  const udspiller = s.linje![0].udspiller;
  const brugt = s.linje![0].kort[0];
  const dd = s.ddEfter ?? s.ddFoer ?? 0;
  const modspilsside = s.spilfoerer === 'N' || s.spilfoerer === 'S' ? 'OV' : 'NS';
  // Højst fire af de bedste udspil, derefter "og n andre".
  const FLEST = 4;
  const flere = u.bedste.length - FLEST;
  const bedste = T.raad.bedsteUdspil(u.bedste.slice(0, FLEST).map(kortGruppe).join(', ') + (flere > 0 ? T.raad.ogAndre(flere) : ''));
  return (
    <section className="kort raad" aria-labelledby="h-raad-modspil">
      <div className="kort-hoved">
        <h2 id="h-raad-modspil">{T.raad.modspil}</h2>
        <span className="hint">{vi ? T.raad.andreIModspil(T.retning[modspilsside]) : T.raad.iModspil}</span>
      </div>
      <p className="raad-intro">{T.raad.introModspil(dd)}</p>
      <ol className="raad-liste" aria-label={T.raad.noegle}>
        <li>
          <span className="stik-nr">{T.raad.udspil}</span>{' '}
          <div className="raad-linje">
            {u.faktisk !== null && u.pris !== null ? (
              <span className="raad-tekst">
                <strong>
                  <Farver>{T.raad.fra(kort(u.faktisk), T.plads[udspiller])}</Farver>
                </strong>
                {u.pris > 0 ? T.raad.udspilKoster(u.pris, dd, dd - u.pris) : T.raad.udspilGodt(dd)}
              </span>
            ) : (
              <span className="raad-tekst">
                <Farver>{(s.udspil ? T.raad.udspilForkert : T.raad.udspilMangler)(kort(brugt))}</Farver>
              </span>
            )}{' '}
            <span className={u.pris ? 'raad-alt' : 'raad-alt neutral'}>
              <Farver>{bedste}</Farver>
            </span>
          </div>
        </li>
        {s.raad!.modspil.map((n) => (
          <Beslutning key={`${n.stik}-${n.haand}`} spil={s} n={n} modspil />
        ))}
      </ol>
      {teknikMaerker(s).map(({ navn, m }) => (
        <p className="teknik-mod" key={navn}>
          {T.raad.modHvem[navn](modHvem(m, !vi))}
        </p>
      ))}
    </section>
  );
}

/**
 * Analysevinduets råd (SPEC-postmortem-1b-maerker.md, del B). Rådene gælder den bedste linje efter udspillet. Var parret
 * i modspil, står modspillets afsnit først. Et spil, der ikke er spillet eller er passet ud, har ingen råd; kunne
 * teknikken ikke regnes, står det i én linje.
 */
export function Raad({ spil }: { spil: Spil }) {
  const t = spil.teknik;
  if (!spil.spillet || !t) return null;
  if (!t.beregnet) return t.grund === 'tid' || t.grund === 'fejl' ? <p className="note raad-mangler">{T.raad.ikkeRegnet}</p> : null;
  if (!spil.raad || !spil.linje?.length || !spil.spilfoerer) return null;
  return viSpillede(spil) ? (
    <>
      <Spilfoering spil={spil} />
      <Modspil spil={spil} />
    </>
  ) : (
    <>
      <Modspil spil={spil} />
      <Spilfoering spil={spil} />
    </>
  );
}
