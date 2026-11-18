import type { TokenCycle } from '../../api/types';
import { CYCLE_UNAVAILABLE, cycleFacts, investWindowSentence } from '../../lib/cycle';
import { marketCapSol } from '../../lib/money';
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

/** A token's cycle in plain language: phase, how long it could be bought, and what happened after. Presentational. */
export function CycleSummary({ cycle, now }: CycleSummaryProps) {
  return (
    <section className="cycle-summary" aria-labelledby={TITLE_ID}>
      <h2 id={TITLE_ID} className="cycle-summary__title">
        Cycle
      </h2>
      {cycle === null ? (
        <p className="cycle-summary__note">
          {CYCLE_UNAVAILABLE}. It shows how long the token could be bought after appearing in lessfomo, its peak
          and its crash, once the screener reports it.
        </p>
      ) : (
        <>
          <div className="cycle-summary__badges">
            <PhaseBadge phase={cycle.phase} />
            {cycle.appearedLate ? <LateBadge /> : null}
          </div>
          <p className="cycle-summary__window">{investWindowSentence(cycle, now)}</p>
          <p className="cycle-summary__appeared">
            Appeared in lessfomo on{' '}
            <time dateTime={cycle.appearedAt} title={cycle.appearedAt}>
              {formatDate(cycle.appearedAt)} at {formatTimeWithSeconds(cycle.appearedAt)}
            </time>
            {cycle.appearedPriceSol === null
              ? '.'
              : (
                <>
                  , with a market cap of <MoneyValue sol={marketCapSol(cycle.appearedPriceSol)} layout="inline" /> (the
                  base price).
                </>
              )}
          </p>
          <dl className="cycle-summary__facts">
            {cycleFacts(cycle).map((fact) => (
              <div key={fact.key} title={fact.hint}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="cycle-summary__note">
            A cycle is only known as it happens: the peak and the fall keep updating while the token trades. This
            describes what already happened; nothing here predicts what the price does next.
          </p>
        </>
      )}
    </section>
  );
}
