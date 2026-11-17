import type { ReactNode } from 'react';
import type { SmartWalletInToken } from '../../api/types';
import './SmartWallets.css';

export interface SmartWalletsSummaryProps {
  wallets: readonly SmartWalletInToken[];
  /** The list of SmartWalletItem elements. */
  children: ReactNode;
}

/** Headline counts for a token's good-history wallets, the list itself and an honest caveat. */
export function SmartWalletsSummary({ wallets, children }: SmartWalletsSummaryProps) {
  const elite = wallets.filter((w) => w.tierAtEntry === 'elite').length;
  const holding = wallets.filter((w) => w.stillHolding).length;
  return (
    <div className="smart-wallets">
      <p className="smart-wallets__summary">
        <strong>
          {wallets.length} good-history {wallets.length === 1 ? 'wallet' : 'wallets'}
        </strong>{' '}
        bought this token ({elite} elite at the time they bought), {holding} still {holding === 1 ? 'holds' : 'hold'}.
      </p>
      <ul className="smart-wallets__list">{children}</ul>
      <p className="smart-wallets__note">
        Past results do not guarantee future ones. A wallet's record only covers the tokens lessfomo observed in the
        last 7 days, and its tier at entry uses only results that had closed before it bought.
      </p>
    </div>
  );
}
