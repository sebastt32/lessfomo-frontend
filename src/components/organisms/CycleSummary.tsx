import type { TokenCycle } from '../../api/types';
import { CYCLE_UNAVAILABLE, cycleFacts, investWindowSentence, type CycleFact } from '../../lib/cycle';
import { marketCapSol } from '../../lib/money';
import { HelpTip } from '../molecules/HelpTip';
import { MoneyValue } from '../molecules/MoneyValue';
import { formatDate, formatTimeWithSeconds } from '../../lib/format';
import { LateBadge, PhaseBadge } from '../atoms/Tag';
import './CycleSummary.css';

export interface CycleSummaryProps {
  /** null when the backend does not report this token's cycle (yet). */
  cycle: TokenCycle | null;
  /** Reference time (ms since epoch); the sentence counts up while the token is stable. */
  now: number;
}

const TITLE_ID = 'cycle-summary-title';

/** How each fact reads in its "?" button: "¿Qué es el pico?". */
const FACT_TOPICS: Record<CycleFact['key'], string> = {
  riseBefore: 'la subida antes de aparecer',
  peak: 'el pico',
  timeToPeak: 'el tiempo hasta el pico',
  drawdown: 'la mayor caída',
  lastPrice: 'el último precio',
};

/** A token's cycle in plain language: phase, how long it could be bought, and what happened after. Presentational. */
export function CycleSummary({ cycle, now }: CycleSummaryProps) {
  return (
    <section className="cycle-summary" aria-labelledby={TITLE_ID}>
      <div className="cycle-summary__heading">
        <h2 id={TITLE_ID} className="cycle-summary__title">
          Ciclo
        </h2>
        <HelpTip topic="el ciclo">
          El camino del token después de aparecer en lessfomo: estable, se duplica (llega a 2× el precio al aparecer),
          pico y caída.
        </HelpTip>
      </div>
      {cycle === null ? (
        <p className="cycle-summary__note">
          {CYCLE_UNAVAILABLE}. Aquí verás cuánto tiempo se pudo comprar el token después de aparecer en lessfomo, su
          pico y su caída, cuando el screener lo informe.
        </p>
      ) : (
        <>
          <div className="cycle-summary__badges">
            <PhaseBadge phase={cycle.phase} />
            {cycle.appearedLate ? <LateBadge /> : null}
          </div>
          <p className="cycle-summary__window">
            {investWindowSentence(cycle, now)}{' '}
            <HelpTip topic="el tiempo para comprar">
              Cuánto tiempo se pudo comprar el token después de aparecer en lessfomo, antes de que empezara la subida
              fuerte.
            </HelpTip>
          </p>
          <p className="cycle-summary__appeared">
            Apareció en lessfomo el{' '}
            <time dateTime={cycle.appearedAt} title={cycle.appearedAt}>
              {formatDate(cycle.appearedAt)} a las {formatTimeWithSeconds(cycle.appearedAt)}
            </time>
            {cycle.appearedPriceSol === null
              ? '.'
              : (
                <>
                  , con un market cap de <MoneyValue sol={marketCapSol(cycle.appearedPriceSol)} layout="inline" />{' '}
                  (precio al aparecer).
                </>
              )}{' '}
            <HelpTip topic="el precio al aparecer">
              El precio que tenía el token cuando apareció en lessfomo. El pico, la caída y el último precio se miden
              contra este precio.
            </HelpTip>
          </p>
          <dl className="cycle-summary__facts">
            {cycleFacts(cycle).map((fact) => (
              <div key={fact.key}>
                <dt>
                  {fact.label} <HelpTip topic={FACT_TOPICS[fact.key]}>{fact.hint}.</HelpTip>
                </dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="cycle-summary__note">
            Un ciclo solo se conoce mientras ocurre: el pico y la caída se siguen actualizando mientras el token se
            opera. Esto describe lo que ya pasó; nada de esto predice qué hará el precio.
          </p>
        </>
      )}
    </section>
  );
}
