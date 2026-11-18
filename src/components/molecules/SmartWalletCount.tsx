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
      <span className="smart-count smart-count--unknown" title="Todavía no hay datos de wallets">
        —
      </span>
    );
  }
  const good = `${counts.count} ${plural(counts.count, 'wallet con buen historial lo compró', 'wallets con buen historial lo compraron')}, ${counts.elite} élite, ${counts.holding} todavía lo ${plural(counts.holding, 'tiene', 'tienen')}`;
  if (typeof counts.conviction !== 'number') {
    return (
      <span className="smart-count" title={`${good}. Todavía no hay datos de wallets que mantienen`}>
        <span className="smart-count__total">{formatCount(counts.count)} buen historial</span>
        <span className="smart-count__detail">
          {formatCount(counts.elite)} élite · {formatCount(counts.holding)} lo tienen
        </span>
      </span>
    );
  }
  return (
    <span
      className="smart-count"
      title={`${counts.conviction} ${plural(counts.conviction, 'wallet que mantiene', 'wallets que mantienen')} (buen historial, suelen quedarse con lo que compran). ${good}`}
    >
      <span className="smart-count__total">{formatCount(counts.conviction)} mantienen</span>
      {/* Stacked visually; the separator keeps the text readable as one line for copy and screen readers. */}
      <span className="visually-hidden"> · </span>
      <span className="smart-count__detail">
        {formatCount(counts.count)} buen historial · {formatCount(counts.holding)} lo tienen
      </span>
    </span>
  );
}
