import type { MouseEvent } from 'react';
import type { Mover } from '../../api/types';
import { PriceDelta } from '../atoms/PriceDelta';
import { ScoreBar } from '../atoms/ScoreBar';
import { DateTime } from '../atoms/DateTime';
import { StatusBadge } from '../atoms/StatusBadge';
import { LiquidityCell } from '../molecules/Liquidity';
import { SmartWalletCount } from '../molecules/SmartWalletCount';
import { TokenLinks } from '../molecules/TokenLinks';
import { TokenName } from '../molecules/TokenName';
import { formatComponent, formatCount } from '../../lib/format';
import './MoversTable.css';

export interface MoversTableProps {
  movers: readonly Mover[];
  selectedMint: string | null;
  onSelect: (mint: string) => void;
}

export function MoversTable({ movers, selectedMint, onSelect }: MoversTableProps) {
  function handleRowClick(event: MouseEvent<HTMLTableRowElement>, mint: string) {
    // Links open their own page; the token button already bubbles a click here.
    if ((event.target as Element).closest('a')) return;
    onSelect(mint);
  }

  return (
    <div className="movers-table__scroll" role="region" aria-label="Top movers table" tabIndex={0}>
      <table className="movers-table">
        <caption className="visually-hidden">Top movers ranked by momentum score, highest first</caption>
        <thead>
          <tr>
            <th scope="col" className="movers-table__rank">
              #
            </th>
            <th scope="col">Token</th>
            <th scope="col">Created</th>
            <th scope="col">Score</th>
            <th scope="col" className="movers-table__num">
              <abbr title="Wallets that bought the token: conviction wallets (good record, usually hold), all good-history wallets and how many still hold">Smart wallets</abbr>
            </th>
            <th scope="col" className="movers-table__num">
              <abbr title="Unique buyers in the last minute / last 5 minutes">Buyers 1m / 5m</abbr>
            </th>
            <th scope="col" className="movers-table__num">
              Acceleration
            </th>
            <th scope="col" className="movers-table__num">
              Buy pressure
            </th>
            <th scope="col" className="movers-table__num">
              Δ price 5m
            </th>
            <th scope="col" className="movers-table__num">
              Liquidity
            </th>
            <th scope="col">Safety</th>
            <th scope="col">Links</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((mover, index) => {
            const selected = mover.mint === selectedMint;
            return (
              <tr
                key={mover.mint}
                className={selected ? 'movers-table__row movers-table__row--selected' : 'movers-table__row'}
                onClick={(event) => handleRowClick(event, mover.mint)}
              >
                <td className="movers-table__rank">{index + 1}</td>
                <th scope="row" className="movers-table__token">
                  <button
                    type="button"
                    className="token-button"
                    aria-pressed={selected}
                    aria-label={`Show details for ${mover.symbol}`}
                  >
                    <TokenName symbol={mover.symbol} name={mover.name} />
                  </button>
                </th>
                <td>
                  <DateTime iso={mover.detectedAt} layout="stacked" />
                </td>
                <td>
                  <ScoreBar score={mover.score} />
                </td>
                <td className="movers-table__num">
                  <SmartWalletCount counts={mover.smartWallets} />
                </td>
                <td className="movers-table__num">
                  {formatCount(mover.metrics.uniqueBuyers1m)} / {formatCount(mover.metrics.uniqueBuyers5m)}
                </td>
                <td className="movers-table__num">{formatComponent(mover.components.acceleration)}</td>
                <td className="movers-table__num">{formatComponent(mover.components.buyPressure)}</td>
                <td className="movers-table__num">
                  <PriceDelta value={mover.metrics.priceChange5mPct} />
                </td>
                <td className="movers-table__num">
                  <LiquidityCell liquidity={mover.liquidity} />
                </td>
                <td>
                  <StatusBadge status={mover.status} />
                </td>
                <td>
                  <TokenLinks mint={mover.mint} symbol={mover.symbol} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
