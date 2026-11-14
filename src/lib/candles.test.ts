import { describe, expect, it } from 'vitest';
import type { Candle, DevTrade, TradeView } from '../api/types';
import {
  applyTrade,
  bucketStart,
  convertCandles,
  devTradeMarkers,
  formatChartValue,
  toChartValue,
  type ChartView,
} from './candles';

const T0 = 1_763_064_000; // a multiple of 300, so it starts a 1s, 1m and 5m bucket

function candle(overrides: Partial<Candle> = {}): Candle {
  return {
    time: T0,
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volumeSol: 3,
    buyVolumeSol: 2,
    sellVolumeSol: 1,
    trades: 3,
    ...overrides,
  };
}

function trade(overrides: Partial<TradeView> = {}): TradeView {
  return {
    signature: 'sig',
    trader: 'wallet',
    side: 'buy',
    solAmount: 0.5,
    tokenAmount: 1000,
    priceSol: 11.5,
    isDev: false,
    time: T0 + 30,
    ...overrides,
  };
}

describe('bucketStart', () => {
  it('floors a Unix time to the start of its 1s, 1m or 5m bucket', () => {
    expect(bucketStart(T0 + 299, '1s')).toBe(T0 + 299);
    expect(bucketStart(T0 + 119, '1m')).toBe(T0 + 60);
    expect(bucketStart(T0 + 299, '5m')).toBe(T0);
    expect(bucketStart(T0 + 300, '5m')).toBe(T0 + 300);
  });
});

describe('applyTrade', () => {
  it('updates the forming candle when the trade falls in its bucket', () => {
    const series = [candle({ time: T0 - 60 }), candle()];
    const next = applyTrade(series, trade({ priceSol: 13, solAmount: 0.5, side: 'sell' }), '1m');

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(series[0]);
    expect(next[1]).toEqual(
      candle({ high: 13, close: 13, volumeSol: 3.5, sellVolumeSol: 1.5, buyVolumeSol: 2, trades: 4 }),
    );
    expect(series[1]).toEqual(candle()); // input untouched
  });

  it('lowers the low and adds buy volume', () => {
    const [last] = applyTrade([candle()], trade({ priceSol: 8, solAmount: 1, side: 'buy' }), '1m');
    expect(last).toMatchObject({ low: 8, high: 12, close: 8, open: 10, buyVolumeSol: 3, volumeSol: 4 });
  });

  it('starts a new bucket when the trade is newer than the forming candle', () => {
    const series = [candle()];
    const next = applyTrade(series, trade({ time: T0 + 75, priceSol: 14, solAmount: 2, side: 'buy' }), '1m');

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(series[0]);
    expect(next[1]).toEqual({
      time: T0 + 60,
      open: 14,
      high: 14,
      low: 14,
      close: 14,
      volumeSol: 2,
      buyVolumeSol: 2,
      sellVolumeSol: 0,
      trades: 1,
    });
  });

  it('ignores a trade older than the forming candle and returns the same array', () => {
    const series = [candle()];
    expect(applyTrade(series, trade({ time: T0 - 1 }), '1m')).toBe(series);
  });

  it('creates the first candle when there are none', () => {
    const next = applyTrade([], trade({ time: T0 + 2, priceSol: 5, solAmount: 1, side: 'sell' }), '5m');
    expect(next).toEqual([
      { time: T0, open: 5, high: 5, low: 5, close: 5, volumeSol: 1, buyVolumeSol: 0, sellVolumeSol: 1, trades: 1 },
    ]);
  });
});

describe('toChartValue', () => {
  const base: ChartView = { metric: 'price', currency: 'SOL', totalSupply: 1_000_000_000, solUsd: 150 };

  it('keeps the SOL price as is', () => {
    expect(toChartValue(0.00000003, base)).toBe(0.00000003);
  });

  it('converts price to market cap as priceSol × totalSupply', () => {
    expect(toChartValue(0.00000003, { ...base, metric: 'marketCap' })).toBeCloseTo(30, 10);
  });

  it('converts to USD by multiplying by solUsd', () => {
    expect(toChartValue(0.00000003, { ...base, currency: 'USD' })).toBeCloseTo(0.0000045, 15);
    expect(toChartValue(0.00000003, { ...base, metric: 'marketCap', currency: 'USD' })).toBeCloseTo(4500, 8);
  });

  it('stays in SOL when USD is requested but solUsd is unknown', () => {
    expect(toChartValue(2, { ...base, currency: 'USD', solUsd: null })).toBe(2);
  });
});

describe('convertCandles', () => {
  it('maps OHLC and volume to the view and marks the dominant side', () => {
    const view: ChartView = { metric: 'marketCap', currency: 'USD', totalSupply: 10, solUsd: 2 };
    const bars = convertCandles(
      [candle(), candle({ time: T0 + 60, buyVolumeSol: 1, sellVolumeSol: 4, volumeSol: 5 })],
      view,
    );
    expect(bars).toEqual([
      { time: T0, open: 200, high: 240, low: 180, close: 220, volume: 6, side: 'buy' },
      { time: T0 + 60, open: 200, high: 240, low: 180, close: 220, volume: 10, side: 'sell' },
    ]);
  });
});

describe('devTradeMarkers', () => {
  it('places each dev trade on its candle bucket, oldest first, skipping trades before the first candle', () => {
    const devTrades: DevTrade[] = [
      { time: T0 + 70, side: 'sell', solAmount: 1.25 },
      { time: T0 + 5, side: 'buy', solAmount: 2 },
      { time: T0 - 100, side: 'buy', solAmount: 9 },
    ];
    expect(devTradeMarkers(devTrades, '1m', T0)).toEqual([
      { time: T0, side: 'buy', text: 'Dev buy 2 SOL' },
      { time: T0 + 60, side: 'sell', text: 'Dev sell 1.25 SOL' },
    ]);
  });

  it('returns no markers without candles', () => {
    expect(devTradeMarkers([{ time: T0, side: 'buy', solAmount: 1 }], '1m', null)).toEqual([]);
  });
});

describe('formatChartValue', () => {
  it('formats tiny prices with a subscript zero count', () => {
    expect(formatChartValue(0.0000000321, 'SOL')).toBe('0.0₇321 SOL');
  });

  it('formats regular prices with four significant digits', () => {
    expect(formatChartValue(0.012346, 'SOL')).toBe('0.01235 SOL');
    expect(formatChartValue(1.5, 'USD')).toBe('$1.50');
  });

  it('formats market caps compactly', () => {
    expect(formatChartValue(45_230, 'USD')).toBe('$45.23K');
    expect(formatChartValue(30.5, 'SOL')).toBe('30.50 SOL');
    expect(formatChartValue(2_100_000, 'SOL')).toBe('2.1M SOL');
  });
});
