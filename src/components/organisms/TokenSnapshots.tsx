import type { TokenSnapshot } from '../../api/types';
import { DateTime } from '../atoms/DateTime';
import { LiquidityCell } from '../molecules/Liquidity';
import { formatCount, formatPercent, formatPriceSol, formatSolAmount } from '../../lib/format';
import { describeMilestone, isEventMilestone } from '../../lib/milestones';
import './TokenSnapshots.css';

export interface TokenSnapshotsProps {
  /** Oldest first, as the API returns them. */
  snapshots: readonly TokenSnapshot[];
  symbol: string;
}

const SOURCE_LABELS: Record<TokenSnapshot['source'], string> = {
  trades: 'Trades',
  dexscreener: 'DexScreener',
  rugcheck: 'RugCheck',
  mixed: 'Mixed',
};

const pair = (a: number | null, b: number | null) =>
  a === null && b === null ? '—' : `${formatCount(a)} / ${formatCount(b)}`;

/** The token's state at each milestone (creation, 5 min, 1 h, day 3, migration, ...), oldest first. */
export function TokenSnapshots({ snapshots, symbol }: TokenSnapshotsProps) {
  return (
    <div className="token-snapshots" role="region" aria-label={`Snapshots of ${symbol}`} tabIndex={0}>
      <table className="token-snapshots__table">
        <caption className="visually-hidden">
          State of {symbol} at each snapshot, oldest first. Volume, buys, sells and buyers count since the previous
          snapshot.
        </caption>
        <thead>
          <tr>
            <th scope="col">Milestone</th>
            <th scope="col">Taken</th>
            <th scope="col" className="token-snapshots__num">
              Price
            </th>
            <th scope="col" className="token-snapshots__num">
              Market cap
            </th>
            <th scope="col" className="token-snapshots__num">
              Volume
            </th>
            <th scope="col" className="token-snapshots__num">
              Buys / sells
            </th>
            <th scope="col" className="token-snapshots__num">
              Buyers
            </th>
            <th scope="col" className="token-snapshots__num">
              Holders
            </th>
            <th scope="col" className="token-snapshots__num">
              Top 10
            </th>
            <th scope="col" className="token-snapshots__num">
              Dev
            </th>
            <th scope="col" className="token-snapshots__num">
              Liquidity
            </th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={`${snapshot.milestone}|${snapshot.at}`}>
              <th
                scope="row"
                className={
                  isEventMilestone(snapshot.milestone)
                    ? 'token-snapshots__milestone token-snapshots__milestone--event'
                    : 'token-snapshots__milestone'
                }
              >
                {describeMilestone(snapshot.milestone)}
              </th>
              <td>
                <DateTime iso={snapshot.at} layout="stacked" />
              </td>
              <td className="token-snapshots__num">{formatPriceSol(snapshot.priceSol)}</td>
              <td className="token-snapshots__num">{formatSolAmount(snapshot.marketCapSol)}</td>
              <td className="token-snapshots__num">{formatSolAmount(snapshot.volumeSol)}</td>
              <td className="token-snapshots__num">{pair(snapshot.buys, snapshot.sells)}</td>
              <td className="token-snapshots__num">{formatCount(snapshot.uniqueBuyers)}</td>
              <td className="token-snapshots__num">{formatCount(snapshot.holders)}</td>
              <td className="token-snapshots__num">{formatPercent(snapshot.top10Pct)}</td>
              <td className="token-snapshots__num">{formatPercent(snapshot.devHoldsPct)}</td>
              <td className="token-snapshots__num">
                <LiquidityCell liquidity={snapshot.liquidity} />
              </td>
              <td className="token-snapshots__source">{SOURCE_LABELS[snapshot.source] ?? snapshot.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
