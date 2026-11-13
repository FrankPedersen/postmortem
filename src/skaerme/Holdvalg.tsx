import { useState } from 'react';
import { analysér, type Resultat } from '../api';
import { T } from '../tekster';
import type { HoldValg, VaelgSvar } from '../typer';
import { Side, Sidefod, TopBar } from '../ui/Ramme';

/**
 * Skærm 2, valg af hold (kun holdturnering): først holdet, derefter retningen. Hvert hold sidder ved to borde, ét i hver
 * retning, så holdet og retningen giver ét id i vaelg.hold.
 */
export function Holdvalg({ url, vaelg, onSvar }: { url: string; vaelg: VaelgSvar; onSvar: (url: string, r: Resultat) => void }) {
  const [hold, setHold] = useState<string | null>(null);
  const [regner, setRegner] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const navne = [...new Set(vaelg.vaelg.hold.map((h) => h.hold))].sort((a, b) => a.localeCompare(b, 'da', { numeric: true }));
  const valg = hold ? vaelg.vaelg.hold.filter((h) => h.hold === hold).sort((a, b) => (a.retning === 'NS' ? -1 : b.retning === 'NS' ? 1 : 0)) : [];

  async function vælg(h: HoldValg) {
    if (regner) return;
    setFejl(null);
    setRegner(true);
    const r = await analysér(url, h.id);
    setRegner(false);
    if (r.type === 'fejl') setFejl(r.tekst);
    else onSvar(url, r);
  }

  return (
    <>
      <TopBar tilbage={{ href: '#/', label: T.aften.tilbage }} />
      <Side>
        <div className="hoved">
          <span className="eyebrow">{vaelg.turnering.navn}</span>
          <h1 tabIndex={-1}>{T.hold.titel}</h1>
        </div>
        {!hold ? (
          <section className="kort" aria-labelledby="h-hold">
            <h2 id="h-hold">{T.hold.holdSpm}</h2>
            <div className="valg-gitter">
              {navne.map((n) => (
                <button key={n} type="button" className="valg" onClick={() => setHold(n)}>
                  {n}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="kort" aria-labelledby="h-retning">
            <p className="valgt">{hold}</p>
            <h2 id="h-retning">{T.hold.retningSpm}</h2>
            <div className="valg-gitter to">
              {valg.map((h) => (
                <button key={h.id} type="button" className="valg stor" disabled={regner} onClick={() => vælg(h)}>
                  <span className="valg-navn">{T.retning[h.retning]}</span> <span className="valg-under">{T.hold.bord(h.bord)}</span>
                </button>
              ))}
            </div>
            {fejl && (
              <p className="fejl" role="alert">
                {fejl}
              </p>
            )}
            <p className="status" role="status">
              {regner ? T.start.regner : ''}
            </p>
            <button type="button" className="sekundaer" disabled={regner} onClick={() => { setHold(null); setFejl(null); }}>
              {T.hold.andetHold}
            </button>
          </section>
        )}
      </Side>
      <Sidefod />
    </>
  );
}
