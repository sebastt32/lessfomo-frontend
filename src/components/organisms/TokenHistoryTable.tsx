import type { MouseEvent, ReactNode } from 'react';
import type { TokenListItem, TokenSort, TokenSortField } from '../../api/types';
import { DateTime } from '../atoms/DateTime';
import { StatusBadge } from '../atoms/StatusBadge';
import { LifecycleBadge } from '../atoms/Tag';
import { LiquidityCell } from '../molecules/Liquidity';
import { SmartWalletCount } from '../molecules/SmartWalletCount';
import { TokenName } from '../molecules/TokenName';
import { formatCount, formatRelativeTime, formatScore, formatSolAmount } from '../../lib/format';
import './TokenHistoryTable.css';

export interface TokenHistoryTableProps {
  items: readonly TokenListItem[];
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  sort: TokenSort;
  onSortChange: (sort: TokenSort) => void;
  /** Reference time for relative timestamps (ms since epoch). */
  now: number;
}

const SORT_LABELS: Record<TokenSortField, string> = {
  detectedAt: 'Created',
  liquidity: 'Liquidity',
  peakMarketCapSol: 'Peak market cap',
  maxScore: 'Max score',
  smartWallets: 'Smart wallets',
  convictionWallets: 'Conviction wallets',
};

/** The API sorts these only from highest to lowest. */
const DESC_ONLY: ReadonlySet<TokenSortField> = new Set(['smartWallets', 'convictionWallets']);

interface SortableHeaderProps {
  field: TokenSortField;
  sort: TokenSort;
  onSortChange: (sort: TokenSort) => void;
  numeric?: boolean;
}

function SortableHeader({ field, sort, onSortChange, numeric }: SortableHeaderProps) {
  const active = sort.field === field;
  const label = SORT_LABELS[field];
  // A new column starts descending (newest, highest first); the active one flips.
  const flip = active && sort.direction === 'desc' && !DESC_ONLY.has(field);
  const next: TokenSort = { field, direction: flip ? 'asc' : 'desc' };
  return (
    <th
      scope="col"
      className={numeric ? 'history-table__num' : undefined}
      aria-sort={active ? (sort.direction === 'desc' ? 'descending' : 'ascending') : undefined}
    >
      <button
        type="button"
        className="history-table__sort"
        onClick={() => onSortChange(next)}
        aria-label={`Sort by ${label.toLowerCase()}, ${next.direction === 'desc' ? 'descending' : 'ascending'}`}
      >
        {label}
        <span className="history-table__arrow" aria-hidden="true">
          {active ? (sort.direction === 'desc' ? '↓' : '↑') : '↕'}
        </span>
      </button>
    </th>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <td className="history-table__num">{children}</td>;
}

/** Every token ever detected, one row each. Presentational: rows and sort come from props. */
export function TokenHistoryTable({ items, selectedMint, onSelect, sort, onSortChange, now }: TokenHistoryTableProps) {
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, mint: string) {
    if ((event.target as Element).closest('a, button')) return;
    onSelect(mint);
  }

  return (
    <div className="history-table__scroll" role="region" aria-label="Token history table" tabIndex={0}>
      <table className="history-table">
        <caption className="visually-hidden">
          Tokens detected by the screener. Column headers with buttons change the sort order.
        </caption>
        <thead>
          <tr>
            <SortableHeader field="detectedAt" sort={sort} onSortChange={onSortChange} />
            <th scope="col">Token</th>
            <th scope="col">Safety</th>
            <th scope="col">Lifecycle</th>
            <SortableHeader field="liquidity" sort={sort} onSortChange={onSortChange} numeric />
            <th scope="col" className="history-table__num">
              Last market cap
            </th>
            <SortableHeader field="peakMarketCapSol" sort={sort} onSortChange={onSortChange} numeric />
            <SortableHeader field="maxScore" sort={sort} onSortChange={onSortChange} numeric />
            <SortableHeader field="convictionWallets" sort={sort} onSortChange={onSortChange} numeric />
            <th scope="col" className="history-table__num">
              Holders
            </th>
            <th scope="col">Last trade</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { token } = item;
            const selected = token.mint === selectedMint;
            return (
              <tr
                key={token.mint}
                className={selected ? 'history-table__row history-table__row--selected' : 'history-table__row'}
                onClick={(event) => handleRowClick(event, token.mint)}
              >
                <td>
                  <DateTime iso={token.detectedAt} layout="stacked" />
                </td>
                <th scope="row" className="history-table__token">
                  <button
                    type="button"
                    className="token-button"
                    aria-pressed={selected}
                    aria-label={`Show details for ${token.symbol || token.mint}`}
                    onClick={() => onSelect(token.mint)}
                  >
                    <TokenName symbol={token.symbol} name={token.name} />
                  </button>
                </th>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  <LifecycleBadge lifecycle={item.lifecycle} />
                </td>
                <Num>
                  <LiquidityCell liquidity={item.liquidity} />
                </Num>
                <Num>{formatSolAmount(item.lastMarketCapSol)}</Num>
                <Num>{formatSolAmount(item.peakMarketCapSol)}</Num>
                <Num>{item.maxScore === null ? '—' : formatScore(item.maxScore)}</Num>
                <Num>
                  <SmartWalletCount counts={item.smartWallets} />
                </Num>
                <Num>{formatCount(item.holders)}</Num>
                <td className="history-table__muted">
                  {item.lastTradeAt === null ? (
                    'No trades'
                  ) : (
                    <time dateTime={item.lastTradeAt} title={item.lastTradeAt}>
                      {formatRelativeTime(item.lastTradeAt, now)}
                    </time>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
