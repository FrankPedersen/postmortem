import type { Analyse, Meldesamtale } from '../typer';
import { statusFelter } from '../vaerd';

/**
 * Statusfelterne FIT, UDGANG og SLEM (SPEC-postmortem-2a-vaerd-at-se-paa.md, afsnit 2): symbol, ord og en kort grund, så
 * farven ikke er det eneste, der viser svaret. Én komponent, som analysevinduet og udskriften bruger, og som spilnotatet
 * i v2b kan genbruge (`udskrift` giver sort tekst og kanter til papir).
 */
export function StatusFelter({ m, form, udskrift = false }: { m: Meldesamtale; form: Analyse['turnering']['form']; udskrift?: boolean }) {
  return (
    <ul className={udskrift ? 'status-felter udskrift-status' : 'status-felter'}>
      {statusFelter(m, form).map((f) => (
        <li key={f.felt} className={`status-felt ${f.svar ?? 'ingen'}`}>
          <span className="status-navn">{f.navn}</span>{' '}
          <span className="status-symbol" aria-hidden="true">
            {f.symbol}
          </span>{' '}
          <span className="status-ord">{f.ord}</span>{' '}
          <span className="status-grund">{f.grund}</span>
        </li>
      ))}
    </ul>
  );
}
