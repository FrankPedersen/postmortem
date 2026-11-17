import { T } from '../tekster';
import type { Analyse, Spil } from '../typer';
import { Farver } from '../ui/Ramme';
import { StatusFelter } from '../ui/Status';
import { ejerTekst, folder, overstikTekst } from '../vaerd';

/**
 * Kortet Meldesamtalen øverst i analysevinduet (SPEC-postmortem-2a-vaerd-at-se-paa.md, afsnit 2, skærm 2): FIT, UDGANG
 * og SLEM, en fold pr. felt med facit og "Spørg hinanden" (åben ved måske, fit "Nej" og meldt uden dækning; ellers lukket)
 * og linjerne om overstikket og hvem der ejede spillet. Uden meldesamtale (et svar fra før v2a) vises intet.
 */
export function MeldesamtaleKort({ a, s }: { a: Analyse; s: Spil }) {
  const m = s.spillet ? s.meldesamtale : null;
  if (!m) return null;
  const form = a.turnering.form;
  const ejer = ejerTekst(m);
  return (
    <section className="kort meldesamtale" aria-labelledby="h-melde">
      <h2 id="h-melde">{T.meldesamtale.titel}</h2>
      <StatusFelter m={m} form={form} />
      <div className="melde-folder">
        {folder(m, form).map((f) => (
          <details key={f.felt} className={f.spoerg.length ? 'melde-fold med-spoerg' : 'melde-fold'} open={f.spoerg.length > 0}>
            <summary>{f.titel}</summary>
            <p>{f.tekst}</p>
            {f.spoerg.length > 0 && (
              <>
                <p className="spoerg-titel">{T.meldesamtale.spoergTitel}</p>
                <ul className="spoerg">
                  {f.spoerg.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </>
            )}
          </details>
        ))}
      </div>
      <dl className="melde-linjer">
        <div>
          <dt>{T.meldesamtale.overstik}</dt>
          <dd>{overstikTekst(m)}</dd>
        </div>
        <div className={ejer.detalje ? 'bred' : undefined}>
          <dt>{T.meldesamtale.ejer}</dt>
          <dd>
            <strong>{ejer.hoved}</strong>
            {ejer.detalje && (
              <>
                {' '}
                <span className="ejer-detalje">
                  <Farver>{ejer.detalje}</Farver>
                </span>
              </>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
