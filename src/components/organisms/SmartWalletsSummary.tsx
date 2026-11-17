import type { ReactNode } from 'react';
import type { SmartWalletInToken } from '../../api/types';
import { DEFAULT_MIN_CONVICTION_WALLETS } from '../../lib/smartWalletFilter';
import './SmartWallets.css';

export interface SmartWalletsSummaryProps {
  wallets: readonly SmartWalletInToken[];
  /** The list of SmartWalletItem elements. */
  children: ReactNode;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Headline counts for a token's good-history wallets, the list itself and honest caveats. */
export function SmartWalletsSummary({ wallets, children }: SmartWalletsSummaryProps) {
  const elite = wallets.filter((w) => w.tierAtEntry === 'elite').length;
  const holding = wallets.filter((w) => w.stillHolding).length;
  // A backend that predates trading styles sends no styleAtEntry at all.
  const styleKnown = wallets.some((w) => w.styleAtEntry !== undefined);
  const conviction = wallets.filter((w) => w.styleAtEntry === 'conviction').length;
  const flippers = wallets.filter((w) => w.styleAtEntry === 'flipper').length;
  return (
    <div className="smart-wallets">
      <p className="smart-wallets__summary">
        {styleKnown ? (
          <>
            <strong>
              {conviction} conviction {plural(conviction, 'wallet', 'wallets')}
            </strong>{' '}
            among {wallets.length} good-history {plural(wallets.length, 'wallet', 'wallets')} that bought this token (
            {flippers} {plural(flippers, 'flipper', 'flippers')}, {elite} elite at the time they bought), {holding}{' '}
            still {plural(holding, 'holds', 'hold')}.
          </>
        ) : (
          <>
            <strong>
              {wallets.length} good-history {plural(wallets.length, 'wallet', 'wallets')}
            </strong>{' '}
            bought this token ({elite} elite at the time they bought), {holding} still {plural(holding, 'holds', 'hold')}.
          </>
        )}
      </p>
      <p className="smart-wallets__note" role="note">
        {styleKnown ? (
          <>
            <strong>Conviction vs flipper.</strong> A conviction wallet has a good record and usually holds what it buys:
            it sold within 2 minutes in at most 30% of its recent tokens. A flipper sold within 2 minutes in 60% or more.
            Only conviction wallets make a token public (at least {DEFAULT_MIN_CONVICTION_WALLETS}); flippers are shown
            here but never count, because buying right after them usually means becoming their exit liquidity.
          </>
        ) : (
          <>
            Trading style not available yet: this screener API does not report whether these wallets usually hold or
            flip. It appears once the backend is updated.
          </>
        )}
      </p>
      <ul className="smart-wallets__list">{children}</ul>
      <p className="smart-wallets__note">
        Past results do not guarantee future ones. A wallet's record only covers the tokens lessfomo observed in the
        last 7 days, and its tier and style at entry use only results that had closed before it bought.
      </p>
    </div>
  );
}
