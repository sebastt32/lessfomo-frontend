import type { ScreeningView } from '../../api/types';
import { StatusBadge } from '../atoms/StatusBadge';
import { TokenName } from '../molecules/TokenName';
import { describeFailureCode } from '../../lib/failureCodes';
import { formatCount, formatPercent, formatRelativeTime } from '../../lib/format';
import './ScreeningsFeed.css';

export interface ScreeningsFeedProps {
  screenings: readonly ScreeningView[];
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  /** Reference time for relative timestamps (ms since epoch). */
  now: number;
}

export function ScreeningsFeed({ screenings, selectedMint, onSelect, now }: ScreeningsFeedProps) {
  return (
    <ol className="screenings-feed" aria-label="Latest safety checks, newest first">
      {screenings.map((screening) => (
        <li
          key={`${screening.mint}|${screening.evaluatedAt}`}
          className={
            screening.mint === selectedMint
              ? 'screenings-feed__item screenings-feed__item--selected'
              : 'screenings-feed__item'
          }
        >
          <div className="screenings-feed__top">
            <button
              type="button"
              className="token-button"
              aria-pressed={screening.mint === selectedMint}
              aria-label={`Show details for ${screening.symbol}`}
              onClick={() => onSelect(screening.mint)}
            >
              <TokenName symbol={screening.symbol} name={screening.name} />
            </button>
            <StatusBadge status={screening.status} />
            <time className="screenings-feed__time" dateTime={screening.evaluatedAt} title={screening.evaluatedAt}>
              {formatRelativeTime(screening.evaluatedAt, now)}
            </time>
          </div>

          {screening.failureCodes.length > 0 ? (
            <ul className="screenings-feed__codes" aria-label="Failed checks">
              {screening.failureCodes.map((code) => (
                <li key={code} className="screenings-feed__code" title={code}>
                  {describeFailureCode(code)}
                </li>
              ))}
            </ul>
          ) : null}
          {screening.reason ? <p className="screenings-feed__reason">{screening.reason}</p> : null}

          <dl className="screenings-feed__stats">
            <div>
              <dt>Top 10</dt>
              <dd>{formatPercent(screening.top10Pct)}</dd>
            </div>
            <div>
              <dt>Creator</dt>
              <dd>{formatPercent(screening.creatorPct)}</dd>
            </div>
            <div>
              <dt>Holders</dt>
              <dd>{formatCount(screening.totalHolders)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ol>
  );
}
