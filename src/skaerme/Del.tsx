import { useId, useState } from 'react';
import { T } from '../tekster';
import type { Analyse } from '../typer';
import { gennemgang, VALG, valgteSpil, type Valg } from '../vaerd';

/** Lægger teksten i udklipsholderen og giver beskeden til skærmlæseren (role="status"). */
export async function kopier(tekst: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(tekst);
    return T.del.kopieret;
  } catch {
    return T.del.ikkeKopieret;
  }
}

/**
 * Valget under Udskriv og i vinduet til mailen (Franks svar 3, 18. nov. 2026): "De 8", "Alle med mærker (N)" og
 * "Alle spil".
 */
export function ValgAfSpil({ a, valg, setValg, navn }: { a: Analyse; valg: Valg; setValg: (v: Valg) => void; navn: string }) {
  return (
    <fieldset className="kort udskriv-valg">
      <legend>{T.del.hvilke}</legend>
      {VALG.map((v) => (
        <label key={v}>
          <input type="radio" name={navn} checked={valg === v} onChange={() => setValg(v)} />
          <span>{T.del.valg[v](valgteSpil(a, v).length)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * Knapperne Udskriv, Mail og Kopiér øverst på aftenens oversigt (SPEC-postmortem-2a-vaerd-at-se-paa.md, skærm 1).
 * Udskriv viser valget af spil og en knap, der åbner browserens print; udskriften selv er komponenten Udskrift med
 * samme valg. Mail fører til vinduet `#/mail`, og Kopiér lægger gennemgangen af spil værd at se på i udklipsholderen.
 */
export function DelAftenen({ a, valg, setValg }: { a: Analyse; valg: Valg; setValg: (v: Valg) => void }) {
  const [åben, setÅben] = useState(false);
  const [status, setStatus] = useState('');
  const panel = useId();
  return (
    <div className="del-aftenen">
      <div className="del-knapper" role="group" aria-label={T.del.gruppe}>
        <button type="button" className="del-knap" aria-expanded={åben} aria-controls={panel} onClick={() => setÅben((x) => !x)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3h12v6" /><rect x="6" y="14" width="12" height="7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /></svg>
          {T.del.udskriv}
        </button>
        <a className="del-knap" href="#/mail">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
          {T.del.mail}
        </a>
        <button type="button" className="del-knap" onClick={async () => setStatus(await kopier(gennemgang(a, 'vaerd')))}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
          {T.del.kopier}
        </button>
      </div>
      {åben && (
        <div id={panel} className="del-panel">
          <ValgAfSpil a={a} valg={valg} setValg={setValg} navn="udskriv-valg" />
          <button type="button" className="primaer" onClick={() => window.print()}>
            {T.del.udskrivNu}
          </button>
        </div>
      )}
      <p className="status" role="status">
        {status}
      </p>
    </div>
  );
}
