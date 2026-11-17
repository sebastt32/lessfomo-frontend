import type { SmartWalletCounts } from '../../api/types';
import { formatCount } from '../../lib/format';
import './SmartWalletCount.css';

export interface SmartWalletCountProps {
  /** null or undefined when unknown (the backend may not report it yet). */
  counts: SmartWalletCounts | null | undefined;
}

/** Good-history wallets that bought a token: the count, then how many are elite and still holding. */
export function SmartWalletCount({ counts }: SmartWalletCountProps) {
  if (!counts) {
    return (
      <span className="smart-count smart-count--unknown" title="Smart-wallet data not available yet">
        —
      </span>
    );
  }
  return (
    <span
      className="smart-count"
      title={`${counts.count} good-history ${counts.count === 1 ? 'wallet' : 'wallets'} bought it, ${counts.elite} elite, ${counts.holding} still holding`}
    >
      <span className="smart-count__total">{formatCount(counts.count)}</span>
      <span className="smart-count__detail">
        {formatCount(counts.elite)} elite, {formatCount(counts.holding)} holding
      </span>
    </span>
  );
}
