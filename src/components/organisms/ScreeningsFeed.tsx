import type { ScreeningView, SmartWalletCounts, TokenCycle } from '../../api/types';
import { CycleCell } from '../molecules/CycleCell';
import { SmartWalletCount } from '../molecules/SmartWalletCount';
import { DateTime } from '../atoms/DateTime';
import { StatusBadge } from '../atoms/StatusBadge';
import { TokenName } from '../molecules/TokenName';
import { describeFailureCode } from '../../lib/failureCodes';
import { formatCount, formatPercent, formatRelativeTime } from '../../lib/format';
import './ScreeningsFeed.css';

export interface ScreeningsFeedProps {
  screenings: readonly ScreeningView[];
  /** The token shown as selected; omit it when selecting opens the token's own view. */
  selectedMint?: string | null;
  onSelect: (mint: string) => void;
  /** Reference time for relative timestamps (ms since epoch). */
  now: number;
  /** Creation time per mint, when known (safety checks do not carry it). */
  createdAt?: Readonly<Record<string, string>>;
  /** Good-history wallet counts per mint, when known. */
  smartWallets?: Readonly<Record<string, SmartWalletCounts>>;
  /** Cycle per mint, when known (safety checks do not carry it). */
  cycles?: Readonly<Record<string, TokenCycle>>;
}

export function ScreeningsFeed({
  screenings,
  selectedMint,
  onSelect,
  now,
  createdAt = {},
  smartWallets = {},
  cycles = {},
}: ScreeningsFeedProps) {
  return (
    <ol className="screenings-feed" aria-label="Latest safety checks, newest first">
      {screenings.map((screening) => {
        const created = screening.detectedAt ?? createdAt[screening.mint];
        return (
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
              aria-pressed={selectedMint === undefined ? undefined : screening.mint === selectedMint}
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
            {smartWallets[screening.mint] ? (
              <div>
                <dt>Smart wallets</dt>
                <dd>
                  <SmartWalletCount counts={smartWallets[screening.mint]} />
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Cycle</dt>
              <dd>
                <CycleCell cycle={cycles[screening.mint]} now={now} />
              </dd>
            </div>
            {created ? (
              <div>
                <dt>Created</dt>
                <dd>
                  <DateTime iso={created} />
                </dd>
              </div>
            ) : null}
          </dl>
        </li>
        );
      })}
    </ol>
  );
}
