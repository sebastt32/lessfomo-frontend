import type { SmartWalletCounts } from '../../api/types';
import { formatCount } from '../../lib/format';
import './SmartWalletCount.css';

export interface SmartWalletCountProps {
  /** null or undefined when unknown (the backend may not report it yet). */
  counts: SmartWalletCounts | null | undefined;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Wallets that bought a token: conviction wallets first (they decide visibility), then every good-history
 * wallet and how many still hold. Without conviction data (older backend) it shows the good-wallet count.
 */
export function SmartWalletCount({ counts }: SmartWalletCountProps) {
  if (!counts) {
    return (
      <span className="smart-count smart-count--unknown" title="Smart-wallet data not available yet">
        —
      </span>
    );
  }
  const good = `${counts.count} good-history ${plural(counts.count, 'wallet', 'wallets')} bought it, ${counts.elite} elite, ${counts.holding} still holding`;
  if (typeof counts.conviction !== 'number') {
    return (
      <span className="smart-count" title={`${good}. Conviction data not available yet`}>
        <span className="smart-count__total">{formatCount(counts.count)} good</span>
        <span className="smart-count__detail">
          {formatCount(counts.elite)} elite · {formatCount(counts.holding)} holding
        </span>
      </span>
    );
  }
  return (
    <span
      className="smart-count"
      title={`${counts.conviction} conviction ${plural(counts.conviction, 'wallet', 'wallets')} (good record, usually hold). ${good}`}
    >
      <span className="smart-count__total">{formatCount(counts.conviction)} conviction</span>
      {/* Stacked visually; the separator keeps the text readable as one line for copy and screen readers. */}
      <span className="visually-hidden"> · </span>
      <span className="smart-count__detail">
        {formatCount(counts.count)} good · {formatCount(counts.holding)} holding
      </span>
    </span>
  );
}
