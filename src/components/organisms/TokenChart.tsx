import { useMemo, useState } from 'react';
import type { ConnectionState } from '../../api/stream';
import type { Candle, CandleInterval, DevTrade } from '../../api/types';
import {
  CANDLE_INTERVALS,
  convertCandles,
  devTradeMarkers,
  effectiveCurrency,
  formatChartNumber,
  formatChartValue,
  type ChartBar,
  type ChartCurrency,
  type ChartMetric,
} from '../../lib/candles';
import { formatSignedPercent } from '../../lib/format';
import { ExternalLink } from '../atoms/ExternalLink';
import { StatusDot, type StatusDotTone } from '../atoms/StatusDot';
import { CandlestickChart } from '../molecules/CandlestickChart';
import { SegmentedControl, type SegmentedOption } from '../molecules/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '../molecules/SectionState';
import './TokenChart.css';

export interface TokenChartProps {
  symbol: string;
  status: 'loading' | 'ready' | 'error';
  interval: CandleInterval;
  onIntervalChange: (interval: CandleInterval) => void;
  /** Oldest first, prices in SOL per token. */
  candles: readonly Candle[];
  devTrades: readonly DevTrade[];
  totalSupply: number;
  solUsd: number | null;
  connection: ConnectionState;
  errorMessage?: string | null;
  onRetry: () => void;
}

const INTERVAL_OPTIONS: SegmentedOption<CandleInterval>[] = CANDLE_INTERVALS.map((value) => ({ value, label: value }));

const METRIC_OPTIONS: SegmentedOption<ChartMetric>[] = [
  { value: 'price', label: 'Price' },
  { value: 'marketCap', label: 'Market cap' },
];

const LIVE_COPY: Record<ConnectionState, { label: string; tone: StatusDotTone }> = {
  connecting: { label: 'Connecting', tone: 'warn' },
  connected: { label: 'Live trades', tone: 'good' },
  reconnecting: { label: 'Reconnecting', tone: 'warn' },
  offline: { label: 'Live updates offline', tone: 'bad' },
};

function changePercent(bar: ChartBar): number {
  return bar.open === 0 ? 0 : ((bar.close - bar.open) / bar.open) * 100;
}

/** Candlestick chart of one token with interval, price/market cap and SOL/USD controls. */
export function TokenChart({
  symbol,
  status,
  interval,
  onIntervalChange,
  candles,
  devTrades,
  totalSupply,
  solUsd,
  connection,
  errorMessage,
  onRetry,
}: TokenChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('price');
  const [currencyChoice, setCurrency] = useState<ChartCurrency>('SOL');
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const currency = effectiveCurrency(currencyChoice, solUsd);

  const bars = useMemo(
    () => convertCandles(candles, { metric, currency, totalSupply, solUsd }),
    [candles, metric, currency, totalSupply, solUsd],
  );
  // Keyed on the first candle time, not the array, so live ticks do not reset the markers.
  const firstTime = candles[0]?.time ?? null;
  const markers = useMemo(() => devTradeMarkers(devTrades, interval, firstTime), [devTrades, interval, firstTime]);

  const currencyOptions: SegmentedOption<ChartCurrency>[] = [
    { value: 'SOL', label: 'SOL' },
    {
      value: 'USD',
      label: 'USD',
      disabled: solUsd === null,
      ...(solUsd === null ? { hint: 'The SOL/USD price is not available right now' } : {}),
    },
  ];

  const metricName = metric === 'price' ? 'Price' : 'Market cap';
  const shown = (hoverTime === null ? undefined : bars.find((bar) => bar.time === hoverTime)) ?? bars.at(-1);
  const live = LIVE_COPY[connection];

  let body;
  if (status === 'loading') {
    body = <LoadingState>Loading chart…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState title="Could not load the chart" onRetry={onRetry}>
        {errorMessage}
      </ErrorState>
    );
  } else if (bars.length === 0) {
    body = (
      <EmptyState title="No trades yet">
        The chart starts with this token's first trade and updates live, so you can keep it open.
      </EmptyState>
    );
  } else {
    body = (
      <CandlestickChart
        bars={bars}
        markers={markers}
        secondsVisible={interval === '1s'}
        label={`${metricName} of ${symbol} in ${currency}, ${interval} candles, ${bars.length} candles`}
        onHover={setHoverTime}
      />
    );
  }

  return (
    <section className="token-chart" aria-label={`${symbol} chart`}>
      <div className="token-chart__toolbar">
        <SegmentedControl label="Candle interval" options={INTERVAL_OPTIONS} value={interval} onChange={onIntervalChange} />
        <SegmentedControl label="Chart value" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
        <SegmentedControl label="Currency" options={currencyOptions} value={currency} onChange={setCurrency} />
        <span className="token-chart__live">
          <StatusDot tone={live.tone} />
          {live.label}
        </span>
      </div>

      {shown && status === 'ready' ? (
        <dl className="token-chart__legend" aria-label={`${metricName} in ${currency}`}>
          <div>
            <dt>
              <abbr title="Open">O</abbr>
            </dt>
            <dd>{formatChartNumber(shown.open)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="High">H</abbr>
            </dt>
            <dd>{formatChartNumber(shown.high)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="Low">L</abbr>
            </dt>
            <dd>{formatChartNumber(shown.low)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="Close">C</abbr>
            </dt>
            <dd className={shown.close >= shown.open ? 'token-chart__up' : 'token-chart__down'}>
              {formatChartValue(shown.close, currency)} ({formatSignedPercent(changePercent(shown))})
            </dd>
          </div>
          <div>
            <dt>
              <abbr title="Volume">Vol</abbr>
            </dt>
            <dd>{formatChartValue(shown.volume, currency)}</dd>
          </div>
        </dl>
      ) : null}

      {body}

      {/* Attribution notice required by the Lightweight Charts license (its NOTICE file). */}
      <p className="token-chart__notice">
        Chart by TradingView Lightweight Charts™, Copyright (с) 2025 TradingView, Inc.{' '}
        <ExternalLink href="https://www.tradingview.com/">tradingview.com</ExternalLink>
      </p>
    </section>
  );
}
