import type { Mover } from '../../api/types';
import { marketCapSol } from '../../lib/money';
import { PriceDelta } from '../atoms/PriceDelta';
import { StatusBadge } from '../atoms/StatusBadge';
import { CycleCell } from '../molecules/CycleCell';
import { MoneyValue } from '../molecules/MoneyValue';
import { SmartWalletCount } from '../molecules/SmartWalletCount';
import { TokenName } from '../molecules/TokenName';
import './MoverCards.css';

export interface MoverCardsProps {
  movers: readonly Mover[];
  onSelect: (mint: string) => void;
  /** Reference time (ms since epoch) for the cycle of tokens that are still stable. */
  now: number;
}

/** The top movers as cards for small screens: the essentials of each token, the full detail one tap away. */
export function MoverCards({ movers, onSelect, now }: MoverCardsProps) {
  return (
    <ol className="mover-cards" aria-label="Top movers">
      {movers.map((mover, index) => (
        <li key={mover.mint} className="mover-card">
          <button
            type="button"
            className="mover-card__button"
            aria-label={`Show details for ${mover.symbol}`}
            onClick={() => onSelect(mover.mint)}
          >
            <span className="mover-card__top">
              <span className="mover-card__rank">{index + 1}</span>
              <TokenName symbol={mover.symbol} name={mover.name} />
              <span className="mover-card__cap">
                <MoneyValue sol={marketCapSol(mover.metrics.lastPriceSol)} />
              </span>
            </span>
            <span className="mover-card__facts">
              <CycleCell cycle={mover.cycle} now={now} />
              <SmartWalletCount counts={mover.smartWallets} />
              <span className="mover-card__delta">
                <PriceDelta value={mover.metrics.priceChange5mPct} />
                <span className="mover-card__hint">5 min</span>
              </span>
              <StatusBadge status={mover.status} />
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}
