import { useId, useState, type FormEvent } from 'react';
import { analysér, type Resultat } from '../api';
import { T } from '../tekster';
import { Markeret, Side, Sidefod, TopBar } from '../ui/Ramme';

/** Skærm 1, start og guide (`#/`). */
export function Start({ url: forrige, onSvar }: { url: string; onSvar: (url: string, r: Resultat) => void }) {
  const [url, setUrl] = useState(forrige);
  const [regner, setRegner] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const felt = useId();
  const hjaelp = useId();

  async function send(e: FormEvent) {
    e.preventDefault();
    if (regner) return;
    setFejl(null);
    setRegner(true);
    const r = await analysér(url);
    setRegner(false);
    if (r.type === 'fejl') setFejl(r.tekst);
    else onSvar(url.trim(), r);
  }

  return (
    <>
      <TopBar />
      <Side>
        <div className="hoved">
          <h1 tabIndex={-1}>{T.start.titel}</h1>
          <p className="intro">{T.start.intro}</p>
        </div>

        <form className="kort formular" onSubmit={send} noValidate>
          <label className="eyebrow" htmlFor={felt}>
            {T.start.label}
          </label>
          <input
            id={felt}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={T.start.pladsholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby={hjaelp}
            aria-invalid={fejl ? true : undefined}
          />
          <p className="hjaelp" id={hjaelp}>
            {T.start.hjaelp}
          </p>
          {fejl && (
            <p className="fejl" role="alert">
              {fejl}
            </p>
          )}
          <button className="primaer" type="submit" disabled={regner}>
            {T.start.knap}
          </button>
          <p className="status" role="status">
            {regner ? T.start.regner : ''}
          </p>
        </form>

        <section className="kort guide" aria-labelledby="h-guide">
          <div className="kort-hoved">
            <h2 id="h-guide">{T.start.guideTitel}</h2>
            <span className="pille">{T.start.guideMaerke}</span>
          </div>
          <ol className="trin">
            {T.start.trin.map((t, i) => (
              <li key={i}>
                <span className="trin-nr" aria-hidden="true">
                  {i + 1}
                </span>
                <p>
                  <Markeret>{t}</Markeret>
                </p>
              </li>
            ))}
          </ol>
          <div className="eksempel">
            <span className="eyebrow">{T.start.eksempelTitel}</span>
            <div className="adresselinje">
              {T.start.eksempelFoer}
              <strong>{T.start.eksempelFed}</strong>
              {T.start.eksempelEfter}
            </div>
          </div>
        </section>

        <div className="lagring">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <p>{T.start.lagring}</p>
        </div>
      </Side>
      <Sidefod />
    </>
  );
}
