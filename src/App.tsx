import { useEffect, useRef, useState } from 'react';
import type { Resultat } from './api';
import { gem, hent, type Tilstand } from './lager';
import { Aften } from './skaerme/Aften';
import { Holdvalg } from './skaerme/Holdvalg';
import { SpilVindue } from './skaerme/SpilVindue';
import { Start } from './skaerme/Start';

type Rute = { side: 'start' } | { side: 'hold' } | { side: 'aften' } | { side: 'spil'; nummer: number };

/** Adresserne: `#/` start, `#/hold` valg af hold, `#/aften` oversigten og `#/spil/<nr>` analysevinduet. */
export function læsRute(hash: string): Rute {
  const h = hash.replace(/^#/, '');
  if (h === '/hold') return { side: 'hold' };
  if (h === '/aften') return { side: 'aften' };
  const m = /^\/spil\/(\d+)$/.exec(h);
  if (m) return { side: 'spil', nummer: Number(m[1]) };
  return { side: 'start' };
}

function gåTil(hash: string, erstat = false) {
  if (erstat) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else window.location.hash = hash;
}

export function App() {
  const [tilstand, setTilstand] = useState<Tilstand | null>(() => hent());
  const [rute, setRute] = useState<Rute>(() => læsRute(window.location.hash));

  useEffect(() => {
    const skift = () => setRute(læsRute(window.location.hash));
    window.addEventListener('hashchange', skift);
    return () => window.removeEventListener('hashchange', skift);
  }, []);

  // En skærm uden det, den viser, går tilbage: aftenen og spillene kræver et svar, valget af hold en holdliste.
  const svar = tilstand?.svar;
  const mangler =
    (rute.side === 'hold' && !tilstand?.vaelg) ||
    ((rute.side === 'aften' || rute.side === 'spil') && !svar) ||
    (rute.side === 'spil' && svar && !svar.spil.some((s) => s.nummer === rute.nummer));
  const vis: Rute = mangler ? (rute.side === 'spil' && svar ? { side: 'aften' } : { side: 'start' }) : rute;

  useEffect(() => {
    if (mangler) gåTil(vis.side === 'aften' ? '#/aften' : '#/', true);
  }, [mangler, vis.side]);

  // Ved et skift af skærm står man øverst, og fokus flyttes til overskriften, så skærmlæseren læser den nye skærm.
  const nøgle = vis.side === 'spil' ? `spil-${vis.nummer}` : vis.side;
  const sidste = useRef(nøgle);
  useEffect(() => {
    if (sidste.current === nøgle) return;
    sidste.current = nøgle;
    document.documentElement.scrollTop = 0;
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
  }, [nøgle]);

  function påSvar(url: string, r: Resultat) {
    if (r.type === 'vaelg') {
      const ny = { url, vaelg: r.svar };
      setTilstand(ny);
      gem(ny);
      gåTil('#/hold');
    } else if (r.type === 'analyse') {
      const ny = { url, vaelg: tilstand?.url === url ? tilstand.vaelg : undefined, svar: r.svar };
      setTilstand(ny);
      gem(ny);
      gåTil('#/aften');
    }
  }

  switch (vis.side) {
    case 'hold':
      return <Holdvalg key={tilstand!.url} url={tilstand!.url} vaelg={tilstand!.vaelg!} onSvar={påSvar} />;
    case 'aften':
      return <Aften svar={svar!} vaelg={tilstand?.vaelg} />;
    case 'spil':
      return <SpilVindue svar={svar!} nummer={vis.nummer} />;
    default:
      return <Start url={tilstand?.url ?? ''} onSvar={påSvar} />;
  }
}
