import { dato, decimaler, kontrakt, kortene, medFortegn, opremsning, parKontrakt, tal } from '../format';
import { T } from '../tekster';
import type { Analyse, Plads, Spil } from '../typer';
import { FAKTORER } from '../typer';
import { feltGrupper, udspilTekst, viSpillede } from '../udledt';
import { Farver } from '../ui/Ramme';
import { StatusFelter } from '../ui/Status';
import { kortLinje, resultatTekst, spoergsmaal, vaerdMaerker, valgteSpil, type Valg } from '../vaerd';

/**
 * Udskriften (SPEC-postmortem-2a-vaerd-at-se-paa.md, afsnit 3, skærm 4): side 1 med aftenens resultat, "Hvor gik
 * pointene?" og listen over de valgte spil, derefter én side pr. spil med hænderne, feltet, faktorerne, meldesamtalen og
 * felterne til makkerparrets gennemgang. Den står kun i udskriften (`@media print` i styles.css) og er skjult for
 * skærmlæsere, fordi skærmen viser det samme.
 */
export function Udskrift({ a, valg }: { a: Analyse; valg: Valg }) {
  const spil = valgteSpil(a, valg);
  const sider = 1 + spil.length;
  const top = T.udskrift.top(dato(a.turnering.dato), a.turnering.navn);
  return (
    <div className="udskrift" aria-hidden="true">
      <Forside a={a} valg={valg} spil={spil} top={top} sider={sider} />
      {spil.map((s, i) => (
        <SpilSide key={s.nummer} a={a} s={s} top={top} side={i + 2} sider={sider} />
      ))}
    </div>
  );
}

function Top({ top, side, sider }: { top: string; side: number; sider: number }) {
  return (
    <div className="udskrift-top">
      <span>{top}</span> <span>{T.udskrift.side(side, sider)}</span>
    </div>
  );
}

function Faktorer({ a, s }: { a: Analyse; s?: Spil }) {
  const d = decimaler(a.turnering.form);
  const f = s ? s.faktorer : a.faktorer;
  if (!f) return null;
  const pas = !!s && (s.kontrakt === 'Pas' || !s.spilfoerer);
  const relevant = (k: (typeof FAKTORER)[number]) =>
    !s || k === 'meldinger' || k === 'held' || (!pas && (k === 'spilfoering' ? viSpillede(s) : !viSpillede(s)));
  return (
    <span className="udskrift-faktorer">
      {FAKTORER.map((k, i) => (
        <span key={k}>
          {i > 0 ? ' · ' : ''}
          {T.gennemgang.faktorNavn[k]} {relevant(k) ? medFortegn(f[k], d) : T.spil.ikkeRelevant}
        </span>
      ))}
    </span>
  );
}

function Forside({ a, valg, spil, top, sider }: { a: Analyse; valg: Valg; spil: Spil[]; top: string; sider: number }) {
  const form = a.turnering.form;
  const d = decimaler(form);
  const retning = a.deltager.retning ? T.retning[a.deltager.retning] : '';
  const uheldige = a.vaerdAtSePaa?.uheldige ?? [];
  return (
    <section className="udskrift-side udskrift-forside">
      <Top top={top} side={1} sider={sider} />{' '}
      <h2 className="udskrift-titel">{T.udskrift.titel}</h2>{' '}
      <p className="udskrift-resultat">
        {form === 'par' ? (
          <>
            {T.aften.par(a.deltager.nummer ?? 0, a.spil.length)}
            <strong>{tal(a.resultat.procent ?? 0)} %</strong>
            {T.aften.parPoint(tal(a.resultat.point ?? 0, d), tal(a.resultat.top ?? 0, d))}
          </>
        ) : (
          <>
            {T.aften.holdUdenNavn(a.deltager.bord ?? 0, retning, a.spil.length)}
            <strong>{T.aften.imp(medFortegn(a.resultat.imp ?? 0))}</strong>
            {T.aften.modAndetBord}
          </>
        )}
      </p>{' '}
      <h3>{T.udskrift.faktorer}</h3>{' '}
      <p>
        <Faktorer a={a} />
      </p>{' '}
      <h3>{T.udskrift.liste[valg](spil.length)}</h3>{' '}
      <ol className="udskrift-liste">
        {spil.map((s) => (
          <li key={s.nummer}>
            <span className="nr">{s.nummer}</span>{' '}
            <span className="linje">
              <Farver>{kortLinje(s)}</Farver>
            </span>{' '}
            <span className="udskrift-procent">{resultatTekst(a, s)}</span>{' '}
            <span className="udskrift-li-maerker">
              <Farver>{vaerdMaerker(a, s).map((m) => m.tekst).join(' · ')}</Farver>
            </span>
          </li>
        ))}
      </ol>
      {valg === 'vaerd' && uheldige.length > 0 && (
        <>
          {' '}
          <p>{T.gennemgang.uheldige(opremsning(uheldige.map(String)))}</p>
        </>
      )}{' '}
      <p className="udskrift-fod">{T.udskrift.fod}</p>
    </section>
  );
}

const PLADSER: Plads[] = ['N', 'W', 'E', 'S'];

function Haand({ s, p }: { s: Spil; p: Plads }) {
  return (
    <div className={`udskrift-haand haand-${p}`}>
      <span className="udskrift-plads">{T.plads[p]}</span>{' '}
      {s.haender[p].split('.').map((farve, i) => (
        <span key={i} className="udskrift-farve">
          <Farver>{['♠', '♥', '♦', '♣'][i]}</Farver>{' '}
          {/* Hvert kort for sig, som bordet på skærmen; afstanden står i CSS. */}
          {farve
            ? [...farve].map((k, j) => (
                <span key={j} className="udskrift-kort">
                  {kortene(k)}
                </span>
              ))
            : '–'}{' '}
        </span>
      ))}
    </div>
  );
}

function SpilSide({ a, s, top, side, sider }: { a: Analyse; s: Spil; top: string; side: number; sider: number }) {
  const form = a.turnering.form;
  const d = decimaler(form);
  const m = s.spillet ? s.meldesamtale : null;
  const spørg = m ? spoergsmaal(m, form, s) : [];
  const vedBordet = !s.spillet
    ? kortLinje(s)
    : s.kontrakt === 'Pas' || !s.spilfoerer
      ? `${T.pas}, ${medFortegn(s.score ?? 0)}.`
      : `${T.pladsKort[s.spilfoerer]} ${kontrakt(s.kontrakt!)}${udspilTekst(s) ? `, ${T.spil.udspil(udspilTekst(s)!)}` : ''}, ${s.stik} stik, ${medFortegn(s.score!)}.`;
  const felt = feltGrupper(s)
    .map((g) => `${medFortegn(g.score)}${g.antal > 1 ? ` ${T.spil.gange(g.antal)}` : ''}${g.jer ? ` ${T.spil.jer}` : ''}`)
    .join(', ');
  const par = s.par.kontrakter.map((p) => parKontrakt(p).tekst).join(T.spil.eller) || T.pas;
  return (
    <section className="udskrift-side udskrift-spil">
      <Top top={top} side={side} sider={sider} />{' '}
      <div className="udskrift-overskrift">
        <h2>{T.udskrift.spil(s.nummer)}</h2>{' '}
        <span>
          <strong>{resultatTekst(a, s)}</strong>
          {form === 'par' && s.point !== null ? T.udskrift.point(tal(s.point, d), tal(s.top ?? 0, d)) : ''}
        </span>
      </div>{' '}
      <div className="udskrift-maerker">
        {vaerdMaerker(a, s).map((x) => (
          <span key={x.tekst} className="udskrift-maerke">
            <Farver>{x.tekst}</Farver>
          </span>
        ))}
      </div>{' '}
      <div className="udskrift-midte">
        <div className="udskrift-bord">
          {PLADSER.map((p) => (
            <Haand key={p} s={s} p={p} />
          ))}
          <div className="udskrift-kompas">
            {T.udskrift.giver(T.pladsKort[s.giver])}
            <br />
            {T.zone[s.zone]}
          </div>
        </div>{' '}
        <div className="udskrift-fakta">
          <p>
            <strong>{T.udskrift.vedBordet}</strong> <Farver>{vedBordet}</Farver>
          </p>{' '}
          <p>
            <strong>{T.udskrift.feltet}</strong> {felt || T.spil.ikkeRelevant}
          </p>{' '}
          <p>
            <strong>{T.udskrift.aabneKort}</strong> <Farver>{T.udskrift.par(par, medFortegn(s.par.score))}</Farver>
          </p>{' '}
          <p>
            <strong>{T.udskrift.faktorer}</strong> <Faktorer a={a} s={s} />
          </p>
        </div>
      </div>{' '}
      {m && (
        <div className="udskrift-melde">
          <StatusFelter m={m} form={form} udskrift />{' '}
          {spørg.length > 0 && (
            <p>
              <strong>{T.udskrift.spoerg}</strong> {spørg.join(' ')}
            </p>
          )}
        </div>
      )}{' '}
      <div className="udskrift-ramme">
        <div className="udskrift-valg">
          <strong>{T.udskrift.beslutning}</strong>{' '}
          {T.udskrift.beslutninger.map((b) => (
            <span key={b}>
              {T.udskrift.boks} {b}{' '}
            </span>
          ))}
        </div>{' '}
        <div className="udskrift-valg">
          <strong>{T.udskrift.aftale}</strong>{' '}
          {T.udskrift.aftaler.map((b) => (
            <span key={b}>
              {T.udskrift.boks} {b}{' '}
            </span>
          ))}
          <span className="udskrift-aarsag">{T.udskrift.aarsag}</span>
        </div>
      </div>{' '}
      <div className="udskrift-aftale">
        <strong>{T.udskrift.naesteGang}</strong>
        <div className="udskrift-linjer" />
      </div>{' '}
      <div className="udskrift-kommentarer">
        <strong>{T.udskrift.kommentarer}</strong>
        <div className="udskrift-linjer" />
      </div>{' '}
      <p className="udskrift-fod">{T.udskrift.fod}</p>
    </section>
  );
}
