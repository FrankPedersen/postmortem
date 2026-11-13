import { kontrakt, kortene } from '../format';
import { T } from '../tekster';
import type { Plads, Spil } from '../typer';
import { forkertUdspil, hp, udspilTekst } from '../udledt';
import { Farver } from './Ramme';

const FARVER = ['S', 'H', 'D', 'C'] as const;
const SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };

/** Hånden til skærmlæseren: "spar B 8 4, hjerter E 8, …" med mellemrum mellem kortene. */
function oplæst(haand: string) {
  return haand
    .split('.')
    .map((f, i) => `${T.farveNavn[FARVER[i]]} ${f ? [...kortene(f).replace(/10/g, 'T')].map((k) => (k === 'T' ? '10' : k)).join(' ') : T.renonce}`)
    .join(', ');
}

/**
 * Bridgebordet efter designsystemets komponent Bridgebord (Fordelingstræneren, src/farvebehandling/ui): kompasset i
 * bordets grønne farve, pladsnavnene som eyebrow og hænderne i Inter 600 med tabulære cifre. Alle fire hænder er synlige,
 * og kontrakt og udspil står i kompassets midte, som i mockuppen.
 */
export function Bridgebord({ spil }: { spil: Spil }) {
  const s = spil;
  const spilfoerer = s.spillet && s.spilfoerer ? s.spilfoerer : null;
  const midte = !s.spillet
    ? [T.spil.ikkeSpillet]
    : s.kontrakt === 'Pas' || !spilfoerer
      ? [T.pas]
      : [`${kontrakt(s.kontrakt!)} · ${T.plads[spilfoerer]}`, ...(udspilTekst(s) ? [T.spil.udspil(udspilTekst(s)!)] : [])];
  const pladser: Plads[] = ['N', 'E', 'S', 'W'];
  const label =
    `${T.spil.bordet}. ` +
    pladser.map((p) => `${T.plads[p]}: ${oplæst(s.haender[p])}`).join('. ') +
    `. ${midte.join(', ')}.`;
  const hånd = (p: Plads) => {
    const navn = (
      <span className="plads-navn">
        {T.plads[p]} · {T.spil.hp(hp(s.haender[p]))}
        {p === spilfoerer ? ` · ${T.spil.spilfoerer}` : ''}
      </span>
    );
    return (
      <div className={`haand haand-${p}`} data-plads={p} key={p}>
        {p !== 'S' && navn}
        {s.haender[p].split('.').map((f, i) => (
          <span className="farve" key={i}>
            <span className={FARVER[i] === 'H' || FARVER[i] === 'D' ? 'roed' : 'sort'}>{SYMBOL[FARVER[i]]}</span> {f ? kortene(f) : '—'}
          </span>
        ))}
        {p === 'S' && navn}
      </div>
    );
  };
  return (
    <figure className="bridgebord" aria-label={label}>
      {hånd('N')}
      {hånd('W')}
      <div className="kompas" aria-hidden="true">
        <span className="kompas-n">{T.pladsKort.N}</span>
        <span className="kompas-v">{T.pladsKort.W}</span>
        <span className="kompas-midte">
          {midte.map((m, i) => {
            // "(står forkert på bridge.dk)" står på sin egen linje med mindre skrift, så kompasset ikke bliver trangt.
            const note = forkertUdspil(s) && m.endsWith(T.spil.forkert);
            return (
              <span key={i}>
                <Farver>{note ? m.slice(0, -T.spil.forkert.length - 1) : m}</Farver>
                {note && (
                  <>
                    {' '}
                    <span className="kompas-note">{T.spil.forkert}</span>
                  </>
                )}
              </span>
            );
          })}
        </span>
        <span className="kompas-oe">{T.pladsKort.E}</span>
        <span className="kompas-s">{T.pladsKort.S}</span>
      </div>
      {hånd('E')}
      {hånd('S')}
    </figure>
  );
}
