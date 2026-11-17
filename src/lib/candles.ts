import type { Candle, CandleInterval, DevTrade, TradeView } from '../api/types';

export const CANDLE_INTERVALS: readonly CandleInterval[] = ['1s', '1m', '5m', '15m', '1h'];

const INTERVAL_SECONDS: Record<CandleInterval, number> = { '1s': 1, '1m': 60, '5m': 300, '15m': 900, '1h': 3600 };

export type ChartMetric = 'price' | 'marketCap';
export type ChartCurrency = 'SOL' | 'USD';

/** What the chart shows: price or market cap, in SOL or USD. */
export interface ChartView {
  metric: ChartMetric;
  currency: ChartCurrency;
  totalSupply: number;
  solUsd: number | null;
}

/** One candle converted to the chart's view. */
export interface ChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Which side moved more SOL in this bucket; colors the volume bar. */
  side: 'buy' | 'sell';
}

export interface DevMarker {
  time: number;
  side: 'buy' | 'sell';
  text: string;
}

/** Start of the bucket a Unix time (seconds) belongs to. */
export function bucketStart(time: number, interval: CandleInterval): number {
  const size = INTERVAL_SECONDS[interval];
  return Math.floor(time / size) * size;
}

/**
 * Merges a live trade into a candle series (oldest first) without mutating it.
 * A trade in the forming candle's bucket updates it, a newer one starts a new candle,
 * and an older one is ignored (the same array is returned).
 */
export function applyTrade(candles: readonly Candle[], trade: TradeView, interval: CandleInterval): Candle[] {
  const time = bucketStart(trade.time, interval);
  const last = candles.at(-1);
  const buy = trade.side === 'buy' ? trade.solAmount : 0;
  const sell = trade.side === 'sell' ? trade.solAmount : 0;

  if (last && time < last.time) return candles as Candle[];

  if (last && time === last.time) {
    const updated: Candle = {
      ...last,
      high: Math.max(last.high, trade.priceSol),
      low: Math.min(last.low, trade.priceSol),
      close: trade.priceSol,
      volumeSol: last.volumeSol + trade.solAmount,
      buyVolumeSol: last.buyVolumeSol + buy,
      sellVolumeSol: last.sellVolumeSol + sell,
      trades: last.trades + 1,
    };
    return [...candles.slice(0, -1), updated];
  }

  const price = trade.priceSol;
  return [
    ...candles,
    {
      time,
      open: price,
      high: price,
      low: price,
      close: price,
      volumeSol: trade.solAmount,
      buyVolumeSol: buy,
      sellVolumeSol: sell,
      trades: 1,
    },
  ];
}

/** USD is only possible when the SOL/USD price is known. */
export function effectiveCurrency(currency: ChartCurrency, solUsd: number | null): ChartCurrency {
  return currency === 'USD' && solUsd !== null ? 'USD' : 'SOL';
}

function currencyFactor(view: ChartView): number {
  return effectiveCurrency(view.currency, view.solUsd) === 'USD' ? (view.solUsd as number) : 1;
}

/** Market cap is priceSol × totalSupply; USD multiplies by solUsd (docs/API.md). */
export function toChartValue(priceSol: number, view: ChartView): number {
  const base = view.metric === 'marketCap' ? priceSol * view.totalSupply : priceSol;
  return base * currencyFactor(view);
}

export function convertCandles(candles: readonly Candle[], view: ChartView): ChartBar[] {
  const factor = currencyFactor(view);
  return candles.map((c) => ({
    time: c.time,
    open: toChartValue(c.open, view),
    high: toChartValue(c.high, view),
    low: toChartValue(c.low, view),
    close: toChartValue(c.close, view),
    volume: c.volumeSol * factor,
    side: c.buyVolumeSol >= c.sellVolumeSol ? 'buy' : 'sell',
  }));
}

/** Dev trades placed on their candle bucket, oldest first; trades before the first candle are dropped. */
export function devTradeMarkers(
  devTrades: readonly DevTrade[],
  interval: CandleInterval,
  firstCandleTime: number | null,
): DevMarker[] {
  if (firstCandleTime === null) return [];
  return devTrades
    .map((t) => ({
      time: bucketStart(t.time, interval),
      side: t.side,
      text: `Dev ${t.side} ${Number(t.solAmount.toPrecision(3))} SOL`,
    }))
    .filter((m) => m.time >= firstCandleTime)
    .sort((a, b) => a.time - b.time);
}

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

/** Number only, for axis labels: compact above 1000, subscript zero count for tiny values. */
export function formatChartNumber(value: number): string {
  if (value === 0 || !Number.isFinite(value)) return '0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1000) return sign + compact.format(abs);
  if (abs >= 1) return sign + abs.toFixed(2);

  const [mantissa = '0', exponent = '0'] = abs.toExponential(3).split('e');
  const zeros = -Number(exponent) - 1;
  if (zeros < 4) return sign + Number(abs.toPrecision(4)).toString();
  const digits = mantissa.replace('.', '').replace(/0+$/, '');
  const count = String(zeros)
    .split('')
    .map((d) => SUBSCRIPT_DIGITS[Number(d)])
    .join('');
  return `${sign}0.0${count}${digits}`;
}

export function formatChartValue(value: number, currency: ChartCurrency): string {
  const number = formatChartNumber(value);
  return currency === 'USD' ? `$${number}` : `${number} SOL`;
}
