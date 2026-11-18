import { formatUsdCompact, solToUsd } from '../../lib/money';
import { formatSolAmount } from '../../lib/format';
import { useSolUsd } from '../../state/solUsd';
import './MoneyValue.css';

export interface MoneyValueProps {
  /** Amount in SOL; null or undefined when unknown. */
  sol: number | null | undefined;
  /** stacked: dollars with SOL below (table cells); inline: "$45.2K (30.1 SOL)" inside a sentence. */
  layout?: 'stacked' | 'inline';
}

/** An amount in dollars as the main figure and in SOL as the detail; SOL only while the SOL/USD price is unknown. */
export function MoneyValue({ sol, layout = 'stacked' }: MoneyValueProps) {
  const solUsd = useSolUsd();
  const usd = solToUsd(sol, solUsd);
  const solText = formatSolAmount(sol ?? null);
  if (usd === null) return <span className="money">{solText}</span>;
  if (layout === 'inline') {
    return (
      <span className="money">
        {formatUsdCompact(usd)} <span className="money__sol">({solText})</span>
      </span>
    );
  }
  return (
    <span className="money money--stacked">
      <span className="money__usd">{formatUsdCompact(usd)}</span>
      <span className="money__sol">{solText}</span>
    </span>
  );
}
