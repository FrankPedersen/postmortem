import { kontrakt, kort, medFortegn, parKontrakt, tal } from '../format';
import { T } from '../tekster';
import type { Analyse, Benaevnelse, Plads, Spil } from '../typer';
import { feltGrupper, forkertUdspil, viSpillede } from '../udledt';
import { Bridgebord } from '../ui/Bridgebord';
import { Farver, Side, Sidefod, TopBar } from '../ui/Ramme';

const KOLONNER: [Benaevnelse, string][] = [['C', '♣'], ['D', '♦'], ['H', '♥'], ['S', '♠'], ['NT', 'NT']];
const RÆKKER: Plads[] = ['N', 'S', 'E', 'W'];

const tegn = (v: number): 'plus' | 'minus' | 'nul' => (v > 0 ? 'plus' : v < 0 ? 'minus' : 'nul');
const art = (v: number) => (v < 0 ? 'miss' : v > 0 ? 'ok' : 'neutral');

/** De fire faktorer for spillet med en linje tekst hver. */
function faktorLinjer(a: Analyse, s: Spil) {
  const f = s.faktorer!;
  const pas = s.kontrakt === 'Pas' || !s.spilfoerer;
  const vi = viSpillede(s);
  const efter = s.ddEfter !== null && !s.udspilseffekt?.ukendt ? s.ddEfter : null;
  const par = s.par.kontrakter.map((p) => {
    const { kontrakt: k, side } = parKontrakt(p);
    return side ? `${T.retningKort[side]} ${k}` : k;
  });
  const meldinger =
    f.meldinger < 0 ? T.forklaring.meldingerBedre(par.join(T.spil.eller)) : f.meldinger > 0 ? T.forklaring.meldingerOver : T.forklaring.meldingerSom;
  // Modpartens fejl er flyttet fra spilføringen eller modspillet til held og uheld (SVAR.md, modpartensFejl).
  const fejl = s.modpartensFejl ?? 0;
  const flyttet = fejl > 0 ? T.forklaring.flyttet : '';
  const spilfoering = pas
    ? T.forklaring.pas
    : vi
      ? (efter !== null ? T.forklaring.spilfoering(efter, s.stik!) : T.forklaring.spilfoeringUkendt(s.ddFoer!, s.stik!)) + flyttet
      : T.forklaring.iModspil;
  const modspil = pas
    ? T.forklaring.pas
    : !vi
      ? (efter !== null ? T.forklaring.modspil(s.ddFoer!, efter, s.stik!) : T.forklaring.modspilUkendt(s.ddFoer!, s.stik!)) + flyttet
      : T.forklaring.iSpilfoering;
  // Held er P(S_par) − middel plus modpartens udspil, når parret var spilfører, plus modpartens fejl (SVAR.md);
  // sætningen om feltet følger den første del.
  const udspilHjalp = vi && s.udspilseffekt?.udspilAf === 'modparten' ? s.udspilseffekt.point : 0;
  const feltet = (a.turnering.form === 'par' ? T.forklaring.heldPar : T.forklaring.heldHold)[tegn(f.held - udspilHjalp - fejl)];
  const kunne = efter ?? s.ddFoer!;
  const fejlTekst = fejl > 0 ? (vi ? T.forklaring.fejlModspil(s.stik!, kunne, medFortegn(fejl)) : T.forklaring.fejlSpilfoerer(s.stik!, kunne, medFortegn(fejl))) : '';
  const held = feltet + (udspilHjalp > 0 ? T.forklaring.udspilHjalp : '') + fejlTekst;
  return [
    { navn: T.faktor.meldinger, linje: meldinger, v: f.meldinger, relevant: true },
    { navn: T.faktor.spilfoering, linje: spilfoering, v: f.spilfoering, relevant: !pas && vi },
    { navn: T.faktor.modspil, linje: modspil, v: f.modspil, relevant: !pas && !vi },
    { navn: T.faktor.held, linje: held, v: f.held, relevant: true },
  ];
}

/** Skærm 4, analysevinduet (`#/spil/<nr>`). */
export function SpilVindue({ svar, nummer }: { svar: Analyse; nummer: number }) {
  const a = svar;
  const i = a.spil.findIndex((x) => x.nummer === nummer);
  const s = a.spil[i];
  const forrige = a.spil[i - 1];
  const næste = a.spil[i + 1];
  const strain = s.spillet && s.kontrakt ? /^[1-7](NT|[CDHS])/.exec(s.kontrakt)?.[1] : undefined;
  const efterKendt = s.spillet && s.udspil && s.ddEfter !== null && !s.udspilseffekt?.ukendt;
  const parTekst = s.par.kontrakter.map((p) => parKontrakt(p).tekst).join(T.spil.eller) || T.pas;

  return (
    <>
      <TopBar tilbage={{ href: '#/aften', label: T.spil.tilbage }} />
      <Side bred>
        <div className="spil-hoved">
          {forrige ? (
            <a className="rund" href={`#/spil/${forrige.nummer}`} aria-label={T.spil.forrige}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
            </a>
          ) : (
            <span className="rund tom" aria-hidden="true" />
          )}
          <div className="spil-titel">
            <h1 tabIndex={-1}>{T.spil.titel(s.nummer)}</h1>
            <span className="hint">{T.spil.under(i + 1, a.spil.length, T.plads[s.giver], T.zone[s.zone])}</span>
          </div>
          {næste ? (
            <a className="rund" href={`#/spil/${næste.nummer}`} aria-label={T.spil.naeste}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
            </a>
          ) : (
            <span className="rund tom" aria-hidden="true" />
          )}
        </div>

        <div className="spil-gitter">
          <div className="kort bord-kort">
            <Bridgebord spil={s} />
          </div>

          <div className="spil-hoejre">
            <section className="kort ved-bordet" aria-labelledby="h-bordet">
              <h2 id="h-bordet">{T.spil.vedBordet}</h2>
              {!s.spillet ? (
                <p>{T.spil.ikkeSpillet}</p>
              ) : (
                <>
                  <div className="fliser">
                    <div className="flise">
                      <span className="flise-navn">{T.spil.kontrakt}</span>{' '}
                      <span className="flise-vaerdi">
                        <Farver>{s.kontrakt === 'Pas' || !s.spilfoerer ? T.pas : `${T.pladsKort[s.spilfoerer]} ${kontrakt(s.kontrakt!)}`}</Farver>
                      </span>
                    </div>
                    <div className="flise">
                      <span className="flise-navn">{T.spil.udspilLabel}</span>{' '}
                      <span className="flise-vaerdi">
                        <Farver>{s.udspil ? kort(s.udspil) : T.spil.ikkeRelevant}</Farver>
                      </span>
                      {forkertUdspil(s) && (
                        <>
                          {' '}
                          <span className="flise-note">{T.spil.forkert}</span>
                        </>
                      )}
                    </div>
                    <div className="flise">
                      <span className="flise-navn">{T.spil.stik}</span>{' '}
                      <span className="flise-vaerdi">{s.stik ?? T.spil.ikkeRelevant}</span>
                    </div>
                    <div className="flise">
                      <span className="flise-navn">{T.spil.score}</span>{' '}
                      <span className="flise-vaerdi">{medFortegn(s.score ?? 0)}</span>
                    </div>
                  </div>
                  {a.turnering.form === 'par' ? (
                    <div className="point-linje">
                      <span>{T.spil.point(tal(s.point ?? 0), tal(s.top ?? 0))}</span>{' '}
                      <span className={`stor-tal ${art((s.procent ?? 50) - 50)}`}>{tal(s.procent ?? 0)} %</span>
                    </div>
                  ) : (
                    <>
                      <div className="point-linje">
                        <span>{T.spil.impMod}</span>{' '}
                        <span className={`stor-tal ${art(s.point ?? 0)}`}>{medFortegn(s.point ?? 0)}</span>
                      </div>
                      {s.holdkammerater !== null && <p className="hint">{T.spil.andetBord(medFortegn(s.holdkammerater))}</p>}
                    </>
                  )}
                  <div className="felt">
                    <span className="eyebrow" id="h-feltet">
                      {T.spil.feltet}
                    </span>
                    <ul aria-labelledby="h-feltet">
                      {feltGrupper(s).map((g) => (
                        <li key={g.score} className={g.jer ? 'jer' : undefined}>
                          <span>
                            {medFortegn(g.score)}
                            {g.jer ? ` ${T.spil.jer}` : ''}
                          </span>{' '}
                          <span className="antal">{T.spil.gange(g.antal)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </section>

            <section className="kort" aria-labelledby="h-dd">
              <div className="kort-hoved">
                <h2 id="h-dd">{T.spil.dd}</h2>
                <span className="hint">{T.spil.ddHint}</span>
              </div>
              <table className="dd" aria-label={T.spil.ddTabel}>
                <thead>
                  <tr>
                    <td />
                    {KOLONNER.map(([b, sym]) => (
                      <th key={b} scope="col" className={b === 'H' || b === 'D' ? 'roed' : undefined}>
                        {sym}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RÆKKER.map((p) => (
                    <tr key={p}>
                      <th scope="row">{T.pladsKort[p]}</th>
                      {KOLONNER.map(([b]) => (
                        <td key={b} className={s.spilfoerer === p && strain === b ? 'kontrakt' : undefined}>
                          {s.ddTabel[p][b]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.ddAfvigelse && <p className="note">{T.spil.ddAfvigelse}</p>}
              <div className="dd-tal">
                <div>
                  <span className="lille">{T.spil.par}</span>{' '}
                  <span className="fed">
                    <Farver>{T.spil.parKontrakter(parTekst, medFortegn(s.par.score))}</Farver>
                  </span>
                </div>
                {s.spillet && s.ddFoer !== null && (
                  <>
                    <div>
                      <span className="lille">{T.spil.maxFoer}</span> <span className="fed">{T.spil.nStik(s.ddFoer)}</span>
                    </div>
                    <div>
                      <span className="lille">
                        <Farver>{efterKendt ? T.spil.maxEfter(kort(s.udspil!)) : T.spil.maxEfterUkendt}</Farver>
                      </span>{' '}
                      <span className="fed">{efterKendt ? T.spil.nStik(s.ddEfter!) : T.spil.ukendt}</span>
                    </div>
                  </>
                )}
              </div>
            </section>

            {s.spillet && s.faktorer && (
              <section className="kort" aria-labelledby="h-spil-faktorer">
                <h2 id="h-spil-faktorer">{T.spil.faktorTitel}</h2>
                <ul className="spil-faktorer">
                  {faktorLinjer(a, s).map((r) => (
                    <li key={r.navn}>
                      <span className="navn">{r.navn}</span>{' '}
                      <span className="linje">
                        <Farver>{r.linje}</Farver>
                      </span>{' '}
                      <span className={`vaerdi ${r.relevant ? art(r.v) : 'neutral'}`}>{r.relevant ? medFortegn(r.v) : T.spil.ikkeRelevant}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="note fod-note">{T.spil.note}</p>
          </div>
        </div>
      </Side>
      <Sidefod />
    </>
  );
}
