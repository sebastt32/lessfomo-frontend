import { useState } from 'react';
import type { CandleInterval } from '../api/types';
import { TokenChart } from '../components/organisms/TokenChart';
import { useTokenChart, type ConnectTokenStreamFn } from '../hooks/useTokenChart';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface TokenChartContainerProps {
  mint: string;
  symbol: string;
  /** Overrides the per-token SSE connection (tests). */
  connect?: ConnectTokenStreamFn;
}

/** Owns the chart's data: candles from the API, live trades and SOL/USD from the token stream. */
export function TokenChartContainer({ mint, symbol, connect }: TokenChartContainerProps) {
  const { meta } = useLiveFeedContext();
  const [interval, setCandleInterval] = useState<CandleInterval>('1m');
  const chart = useTokenChart(meta.client, mint, interval, connect ? { connect } : {});

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
    />
  );
}
