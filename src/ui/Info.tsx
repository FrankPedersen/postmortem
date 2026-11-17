import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { T } from '../tekster';
import type { Turnering } from '../typer';
import { Markeret } from './Ramme';

/**
 * En ⓘ som i de andre apps (SPEC-postmortem-1d-point.md): et klik eller tryk viser teksten, et nyt klik eller tryk
 * skjuler den, og hover er ikke nødvendig. ⓘ er en rigtig knap, så Enter og mellemrum virker; Escape lukker teksten, og
 * fokus står på ⓘ bagefter. Knappen og teksten står hver for sig, så teksten kan stå under kortets overskrift.
 */
export function useInfo() {
  const [åben, setÅben] = useState(false);
  const knap = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!åben) return;
    const tast = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setÅben(false);
      knap.current?.focus();
    };
    document.addEventListener('keydown', tast);
    return () => document.removeEventListener('keydown', tast);
  }, [åben]);
  return { åben, knap, id, skift: () => setÅben((x) => !x) };
}

export type Info = ReturnType<typeof useInfo>;

/** ⓘ: trykfladen er 44 × 44 px, cirklen inden i er mindre. Skærmlæsere hører `label` (fx "Hjælp: Hvor gik pointene?"). */
export function InfoKnap({ info, label }: { info: Info; label: string }) {
  return (
    <button ref={info.knap} type="button" className="info-knap" aria-label={label} aria-expanded={info.åben} aria-controls={info.id} onClick={info.skift}>
      <span className="info-cirkel" aria-hidden="true">
        i
      </span>
    </button>
  );
}

/** Teksten til ⓘ; den står kun i dokumentet, mens den er åben. */
export function InfoTekst({ info, children }: { info: Info; children: ReactNode }) {
  if (!info.åben) return null;
  return (
    <div id={info.id} className="info-tekst" role="note">
      {children}
    </div>
  );
}

/**
 * ⓘ-teksten ved "Hvor gik pointene?" for turneringsformen: parpoint ved parturnering og imp ved holdturnering, med samme
 * tekst på oversigten og i analysevinduet (SPEC-postmortem-1d-point.md, Franks svar 17. nov. 2026).
 */
export function PointInfo({ info, form }: { info: Info; form: Turnering['form'] }) {
  const t = T.pointInfo[form];
  return (
    <InfoTekst info={info}>
      <p>
        <Markeret>{t.tekst}</Markeret>
      </p>
      {t.punkter.length > 0 && (
        <ul>
          {t.punkter.map((punkt) => (
            <li key={punkt}>
              <Markeret>{punkt}</Markeret>
            </li>
          ))}
        </ul>
      )}
      {t.slut && <p>{t.slut}</p>}
    </InfoTekst>
  );
}
