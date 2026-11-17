import { useMemo, useState } from 'react';
import type { CandleInterval, TokenCycle } from '../api/types';
import { TokenChart } from '../components/organisms/TokenChart';
import { useTokenChart, type ConnectTokenStreamFn } from '../hooks/useTokenChart';
import { cycleMarks, investWindowRange } from '../lib/cycle';
import { useLiveFeedContext } from './LiveFeedProvider';

/**
 * Candles loaded for the token view. Public tokens keep 24 hours of trades, so 1m candles need up to 1,440
 * to reach back to the creation; the API clamps the limit (2,000, or 1,000 on older backends).
 */
export const TOKEN_VIEW_CANDLES = 1500;

export interface TokenChartContainerProps {
  mint: string;
  symbol: string;
  /** The token's creation time (TokenView.detectedAt), marked on the chart. */
  createdAt?: string | null;
  /** The token's cycle, marked on the chart; null when the backend does not report it. */
  cycle?: TokenCycle | null;
  /** Called with every `cycle` event of this token from its stream. */
  onCycle?: (cycle: TokenCycle) => void;
  /** Reference time (ms since epoch): where the invest window ends while the token is stable. */
  now?: number;
  /** Overrides the per-token SSE connection (tests). */
  connect?: ConnectTokenStreamFn;
}

/** Owns the chart's data: candles from the API, live trades, SOL/USD and cycle updates from the token stream. */
export function TokenChartContainer({
  mint,
  symbol,
  createdAt = null,
  cycle = null,
  onCycle,
  now,
  connect,
}: TokenChartContainerProps) {
  const { meta } = useLiveFeedContext();
  const [interval, setCandleInterval] = useState<CandleInterval>('1m');
  const chart = useTokenChart(meta.client, mint, interval, {
    limit: TOKEN_VIEW_CANDLES,
    ...(connect ? { connect } : {}),
    ...(onCycle ? { onCycle } : {}),
  });

  const marks = useMemo(() => cycleMarks(createdAt, cycle), [createdAt, cycle]);
  // Only a stable token's window depends on the clock; for the others `now` must not rebuild the range.
  const clock = cycle?.phase === 'stable' ? (now ?? Date.now()) : 0;
  const investRange = useMemo(() => investWindowRange(cycle, clock), [cycle, clock]);

  return (
    <TokenChart
      symbol={symbol}
      status={chart.status}
      interval={interval}
      onIntervalChange={setCandleInterval}
      candles={chart.candles}
      devTrades={chart.devTrades}
      totalSupply={chart.totalSupply}
      solUsd={chart.solUsd}
      connection={chart.connection}
      errorMessage={chart.error?.message ?? null}
      onRetry={chart.retry}
      marks={marks}
      investRange={investRange}
      basePriceSol={cycle?.appearedPriceSol ?? null}
    />
  );
}
