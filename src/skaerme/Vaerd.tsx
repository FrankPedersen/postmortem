import { useId, useState } from 'react';
import { T } from '../tekster';
import type { Analyse } from '../typer';
import { Farver } from '../ui/Ramme';
import { kortLinje, langListe, resultatTekst, vaerdMaerker } from '../vaerd';

/**
 * Kortet "Spil værd at se på" på aftenens oversigt (SPEC-postmortem-2a-vaerd-at-se-paa.md, afsnit 1, skærm 1; Franks
 * svar 2, 17. nov. 2026): de 8 spil med størst omkostning af jeres egne beslutninger med deres mærker, knappen
 * "Vis alle (N)" med resten, linjen med de uheldige og "Hvorfor er et spil med?". Funktionen har ordnet listen.
 */
export function VaerdKort({ a }: { a: Analyse }) {
  const [alle, setAlle] = useState(false);
  const listeId = useId();
  const v = a.vaerdAtSePaa!;
  const lang = langListe(a);
  const vist = alle ? lang : lang.slice(0, v.liste.length);
  const form = a.turnering.form;
  const uheldige = v.uheldige;

  return (
    <section className="kort vaerd" aria-labelledby="h-vaerd">
      <div className="kort-hoved">
        <h2 id="h-vaerd">{T.vaerd.titel}</h2>
        <span className="hint">{T.vaerd.antal(vist.length, a.spil.length)}</span>
      </div>
      <p className="vaerd-intro">{T.vaerd.intro}</p>
      {vist.length > 0 ? (
        <ol id={listeId} className="vaerd-liste" aria-labelledby="h-vaerd">
          {vist.map((s) => (
            <li key={s.nummer}>
              <a className="vaerd-raekke" href={`#/spil/${s.nummer}`}>
                <span className="vaerd-nr">{s.nummer}</span>{' '}
                <span className="vaerd-midte">
                  <span className="vaerd-linje">
                    <Farver>{kortLinje(s)}</Farver>
                  </span>{' '}
                  <span className="vaerd-maerker">
                    {vaerdMaerker(a, s).map((m) => (
                      <span key={m.tekst} className={`vaerd-maerke ${m.art}`}>
                        <Farver>{m.tekst}</Farver>
                      </span>
                    ))}
                  </span>
                </span>{' '}
                <span className={`vaerd-procent ${form === 'par' ? ((s.procent ?? 50) < 50 ? 'miss' : 'ok') : (s.point ?? 0) < 0 ? 'miss' : 'ok'}`}>
                  {resultatTekst(a, s)}
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : (
        <p className="note">{T.vaerd.ingen}</p>
      )}
      {v.resten.length > 0 && (
        <button type="button" className="sekundaer vaerd-vis" aria-expanded={alle} aria-controls={listeId} onClick={() => setAlle((x) => !x)}>
          {alle ? T.vaerd.visFaerre : T.vaerd.visAlle(v.liste.length + v.resten.length)}
        </button>
      )}
      {uheldige.length > 0 && (
        <p className="vaerd-uheldige">
          {T.vaerd.uheldige}
          {uheldige.map((n, i) => (
            <span key={n}>
              {i === 0 ? '' : i === uheldige.length - 1 ? ` ${T.og} ` : ', '}
              <a href={`#/spil/${n}`}>{n}</a>
            </span>
          ))}
        </p>
      )}
      <details className="vaerd-forklaring">
        <summary>{T.vaerd.hvorfor}</summary>
        <ul>
          {T.vaerd.regel[form].map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
