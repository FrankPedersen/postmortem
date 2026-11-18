import { useState, type MouseEvent } from 'react';
import { T } from '../tekster';
import type { Analyse } from '../typer';
import { Side, Sidefod, TopBar } from '../ui/Ramme';
import { emne, gennemgang, type Valg } from '../vaerd';
import { kopier, ValgAfSpil } from './Del';

/**
 * Vinduet "Aftenen til makker" (`#/mail`, SPEC-postmortem-2a-vaerd-at-se-paa.md, afsnit 4, skærm 3): brugeren vælger
 * "De 8", "Alle med mærker (N)" eller "Alle spil" (Franks svar 3), kopierer gennemgangen og åbner mailen med emnet og en kort tekst om at sætte
 * den ind. På en telefon med navigator.share deles hele teksten i stedet.
 */
export function Mail({ svar }: { svar: Analyse }) {
  const a = svar;
  const [valg, setValg] = useState<Valg>('vaerd');
  const [status, setStatus] = useState('');
  const tekst = gennemgang(a, valg);
  const titel = emne(a);
  const mailto = `mailto:?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(T.mail.krop)}`;

  function del(e: MouseEvent<HTMLAnchorElement>) {
    // På mobil deles hele teksten, hvor navigator.share findes; ellers åbner linket mailen.
    const mobil = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (mobil && typeof navigator.share === 'function') {
      e.preventDefault();
      navigator.share({ title: titel, text: tekst }).catch(() => {});
    }
  }

  return (
    <>
      <TopBar tilbage={{ href: '#/aften', label: T.mail.tilbage }} />
      <Side>
        <div className="hoved">
          <h1 tabIndex={-1}>{T.mail.titel}</h1>
        </div>
        <ValgAfSpil a={a} valg={valg} setValg={setValg} navn="mail-valg" />
        <div className="mail-knapper">
          <button type="button" className="primaer" onClick={async () => setStatus(await kopier(tekst))}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
            {T.mail.kopier}
          </button>
          <a className="sekundaer" href={mailto} onClick={del}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
            {T.mail.aabn}
          </a>
          <p className="hint">{T.mail.hjaelp(titel)}</p>
          <p className="status" role="status">
            {status}
          </p>
        </div>
        <section className="kort" aria-labelledby="h-forhaand">
          <h2 id="h-forhaand">{T.mail.forhaand}</h2>
          <pre className="mail-tekst">{tekst}</pre>
          <p className="note">{T.mail.note}</p>
        </section>
      </Side>
      <Sidefod />
    </>
  );
}
