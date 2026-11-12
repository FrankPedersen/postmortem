import type { ReactNode } from 'react';
import { T } from '../tekster';

/**
 * Topbjælken som i Fordelingstræneren (src/ui/TopBar.tsx): den smalle sorte bjælke med 7NT-logoet og linket tilbage til
 * forsiden. På aftenen og i analysevinduet står pilen tilbage først, som i mockuppen.
 */
export function TopBar({ tilbage }: { tilbage?: { href: string; label: string } }) {
  return (
    <header className={tilbage ? 'topbar med-tilbage' : 'topbar'}>
      {tilbage && (
        <a className="topbar-tilbage" href={tilbage.href} aria-label={tilbage.label}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </a>
      )}
      <a className="topbar-brand" href="https://www.kontraktbridge.dk/">
        <span className="kb-logo" aria-hidden="true">
          7NT
        </span>
        <span className="topbar-name">{T.brand}</span>
      </a>
      <span className="topbar-app">{T.app}</span>
    </header>
  );
}

/**
 * Sidefoden som i Fordelingstræneren (src/ui/Footer.tsx) og på forsiden, med Post Mortem i listen over trænere. Alle
 * links er absolutte stier på www.kontraktbridge.dk.
 */
export function Sidefod() {
  const kolonne = (id: string, overskrift: string, links: { href: string; titel: string }[]) => (
    <nav className="site-footer-col" aria-labelledby={id}>
      <h2 id={id}>{overskrift}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.titel}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
  return (
    <footer className="site-footer">
      <div className="site-footer-top">
        <div className="site-footer-about">
          <a className="site-footer-name" href="https://www.kontraktbridge.dk/">
            <span className="kb-logo" aria-hidden="true">
              7NT
            </span>
            {T.brand}
          </a>
          <p>{T.sidefod.om}</p>
          <a className="site-footer-cta" href="/om-mig/">
            {T.sidefod.kontakt} <span className="site-footer-arrow" aria-hidden="true">→</span>
          </a>
        </div>
        <div className="site-footer-cols">
          {kolonne('sidefod-traenere', T.sidefod.traenere, T.sidefod.traenerLinks)}
          {kolonne('sidefod-opslag', T.sidefod.opslag, T.sidefod.opslagLinks)}
        </div>
      </div>
      <p className="site-footer-legal">
        {T.sidefod.legal}
        <span className="site-footer-legal-extra">{T.sidefod.legalEkstra}</span>
      </p>
    </footer>
  );
}

/** Farvesymbolerne i en tekst med rød farve til ♥ og ♦. */
export function Farver({ children }: { children: string }) {
  const dele = children.split(/([♠♥♦♣])/);
  return (
    <>
      {dele.map((d, i) =>
        d === '♥' || d === '♦' ? (
          <span key={i} className="roed">
            {d}
          </span>
        ) : d === '♠' || d === '♣' ? (
          <span key={i} className="sort">
            {d}
          </span>
        ) : (
          d
        ),
      )}
    </>
  );
}

/** En tekst med **fed** og `kode` fra tekster.ts. */
export function Markeret({ children }: { children: string }) {
  const dele = children.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {dele.map((d, i) =>
        d.startsWith('**') ? <strong key={i}>{d.slice(2, -2)}</strong> : d.startsWith('`') ? <code key={i}>{d.slice(1, -1)}</code> : d,
      )}
    </>
  );
}

export function Side({ children, bred = false }: { children: ReactNode; bred?: boolean }) {
  return <main className={bred ? 'side bred' : 'side'}>{children}</main>;
}
