import { useState } from 'react';
import { dato, kontrakt, medFortegn, tal } from '../format';
import { T } from '../tekster';
import type { Analyse, Spil, VaelgSvar } from '../typer';
import { FAKTORER } from '../typer';
import { faktorSum, holdNavn, maerke, resultatArt, spilSum, udspilTekst } from '../udledt';
import { Farver, Side, Sidefod, TopBar } from '../ui/Ramme';

/** Linjen for et spil i listen: "S 4♠ · udspil ♣B · 10 stik · +620". */
function spilLinje(s: Spil) {
  if (!s.spillet) return T.aften.ikkeSpillet;
  if (s.kontrakt === 'Pas' || !s.spilfoerer) return `${T.aften.pasLinje} · ${medFortegn(s.score ?? 0)}`;
  const k = kontrakt(s.kontrakt!);
  const plads = T.pladsKort[s.spilfoerer];
  const udspil = udspilTekst(s);
  return udspil
    ? T.aften.linje(plads, k, udspil, s.stik!, medFortegn(s.score!))
    : T.aften.linjeUdenUdspil(plads, k, s.stik!, medFortegn(s.score!));
}

/** Skærm 3, aftenens oversigt (`#/aften`). */
export function Aften({ svar, vaelg }: { svar: Analyse; vaelg?: VaelgSvar }) {
  const [filter, setFilter] = useState<'alle' | 'tabte'>('alle');
  const a = svar;
  const form = a.turnering.form;
  const antal = a.spil.length;
  const tabte = a.spil.filter((s) => (spilSum(s) ?? 0) < 0);
  const vist = filter === 'alle' ? a.spil : tabte;
  const iAlt = faktorSum(a.faktorer);
  const størst = Math.max(...FAKTORER.map((f) => Math.abs(a.faktorer[f])), 1);
  const enhed = T.aften.enhed[form];
  const retning = a.deltager.retning ? T.retning[a.deltager.retning] : '';
  const navn = holdNavn(a, vaelg);
  const modpartensFejl = a.spil.reduce((sum, s) => sum + (s.modpartensFejl ?? 0), 0);

  return (
    <>
      <TopBar tilbage={{ href: '#/', label: T.aften.tilbage }} />
      <Side>
        <div className="hoved">
          <span className="eyebrow">
            {T.aften.form[form]} · {T.aften.skala[a.turnering.skala]} · {dato(a.turnering.dato)}
          </span>
          <h1 tabIndex={-1}>{a.turnering.navn}</h1>
          <p className="resultat">
            {form === 'par' ? (
              <>
                {T.aften.par(a.deltager.nummer ?? 0, antal)}
                <strong>{tal(a.resultat.procent ?? 0)} %</strong>
                {T.aften.parPoint(tal(a.resultat.point ?? 0), tal(a.resultat.top ?? 0))}
              </>
            ) : (
              <>
                {navn ? T.aften.hold(navn, a.deltager.bord ?? 0, retning, antal) : T.aften.holdUdenNavn(a.deltager.bord ?? 0, retning, antal)}
                <strong>{T.aften.imp(medFortegn(a.resultat.imp ?? 0))}</strong>
                {T.aften.modAndetBord}
              </>
            )}
          </p>
        </div>

        <section className="kort" aria-labelledby="h-faktorer">
          <div className="kort-hoved">
            <h2 id="h-faktorer">{T.aften.faktorTitel}</h2>
            <span className="hint">{T.aften.faktorEnhed[form]}</span>
          </div>
          <ul className="faktorer">
            {FAKTORER.map((f) => {
              const v = a.faktorer[f];
              const bredde = `${(Math.abs(v) / størst) * 50}%`;
              const art = f === 'held' ? 'held' : v < 0 ? 'miss' : 'ok';
              return (
                <li key={f}>
                  <span className="navn">{T.faktor[f]}</span>{' '}
                  <span className="bjaelke" aria-hidden="true">
                    <span className={`fyld ${art} ${v < 0 ? 'venstre' : 'hoejre'}`} style={{ width: bredde }} />
                  </span>{' '}
                  <span className={`vaerdi ${art}`}>{medFortegn(v)}</span>
                </li>
              );
            })}
            {modpartensFejl > 0 && (
              <li className="del">
                <span className="navn">{T.aften.herafFejl}</span>{' '}
                <span className="vaerdi held">{medFortegn(modpartensFejl)}</span>
              </li>
            )}
            <li className="i-alt">
              <span className="navn">{T.aften.iAlt[form]}</span>{' '}
              <span className="vaerdi">{medFortegn(iAlt)}</span>
            </li>
          </ul>
          <div className="forbedring">
            <span className="eyebrow">{T.aften.stoersteTitel}</span>
            <p>
              {a.stoersteForbedring
                ? T.aften.stoerste[a.stoersteForbedring](tal(-a.faktorer[a.stoersteForbedring]), enhed)
                : T.aften.stoerste.ingen}
            </p>
          </div>
          <p className="note">{T.aften.note}</p>
        </section>

        <section className="spillene" aria-labelledby="h-spillene">
          <div className="kort-hoved">
            <h2 id="h-spillene">{T.aften.spillene}</h2>
            <span className="hint">{T.aften.spilleneHint}</span>
          </div>
          <div className="filtre" role="group" aria-label={T.aften.filtre}>
            <button type="button" className="filter" aria-pressed={filter === 'alle'} onClick={() => setFilter('alle')}>
              {T.aften.alle(antal)}
            </button>
            <button type="button" className="filter" aria-pressed={filter === 'tabte'} onClick={() => setFilter('tabte')}>
              {T.aften.tabte(tabte.length)}
            </button>
          </div>
          <ol className="spil-liste" aria-labelledby="h-spillene">
            {vist.map((s) => {
              const m = maerke(s);
              const art = resultatArt(a, s);
              return (
                <li key={s.nummer}>
                  <a className="spil-raekke" href={`#/spil/${s.nummer}`}>
                    <span className="spil-nr">{s.nummer}</span>{' '}
                    <span className="spil-midte">
                      <span className="spil-linje">
                        <Farver>{spilLinje(s)}</Farver>
                      </span>{' '}
                      {s.spillet && (
                        <span className="maerker">
                          <span className={`maerke ${m.art}`}>
                            <Farver>{m.tekst}</Farver>
                          </span>
                        </span>
                      )}
                    </span>{' '}
                    <span className={`spil-resultat ${art}`}>
                      {!s.spillet ? '' : form === 'par' ? `${tal(s.procent ?? 0)} %` : medFortegn(s.point ?? 0)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
          {vist.length === 0 && <p className="note">{T.aften.ingenTabte}</p>}
        </section>
      </Side>
      <Sidefod />
    </>
  );
}
