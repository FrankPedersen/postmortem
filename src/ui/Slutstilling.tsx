import { kort, kortene, oplaest } from '../format';
import { T } from '../tekster';
import type { Plads, Spil } from '../typer';
import { PLADSER, stillingFoer } from '../udledt';
import { Farver } from './Ramme';

const FARVER = ['S', 'H', 'D', 'C'] as const;
const SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };

/**
 * Stillingen ved skvis- eller indspilsstikket som et lille bord (SPEC-postmortem-1b-maerker.md, del B): de kort, der er
 * tilbage før stikket på den bedste linje, og hvem der spiller ud. Det store bord (Bridgebord) er uændret; dette har
 * sine egne klasser, så de to ikke blandes sammen.
 */
export function Slutstilling({ spil, stik }: { spil: Spil; stik: number }) {
  const x = spil.linje?.[stik - 1];
  if (!x) return null;
  const haender = stillingFoer(spil, stik);
  const titel = T.raad.stilling(stik);
  const spiller = T.raad.spiller(T.plads[x.udspiller], kort(x.kort[0]));
  const label = `${titel}. ${PLADSER.map((p) => `${T.plads[p]}: ${oplaest(haender[p])}`).join('. ')}. ${spiller}.`;
  const hånd = (p: Plads) => (
    <div className={`stilling-haand stilling-${p}`} data-plads={p} key={p}>
      <span className="plads-navn">{T.plads[p]}</span>
      {haender[p].split('.').map((f, i) => (
        <span className="farve" key={i}>
          <span className={FARVER[i] === 'H' || FARVER[i] === 'D' ? 'roed' : 'sort'}>{SYMBOL[FARVER[i]]}</span> {f ? kortene(f) : '—'}
        </span>
      ))}
    </div>
  );
  return (
    <figure className="stilling" aria-label={label}>
      <div className="stilling-bord">
        {hånd('N')}
        {hånd('W')}
        <div className="stilling-kompas" aria-hidden="true">
          {PLADSER.map((p) => (
            <span key={p} className={`stilling-plads stilling-plads-${p}${p === x.udspiller ? ' inde' : ''}`}>
              {T.pladsKort[p]}
            </span>
          ))}
        </div>
        {hånd('E')}
        {hånd('S')}
      </div>
      <figcaption>
        <Farver>{`${titel} · ${spiller}`}</Farver>
      </figcaption>
    </figure>
  );
}
