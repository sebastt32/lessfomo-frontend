import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TokenChart, type TokenChartProps } from './TokenChart';
import { charts, lastChart } from '../../test/lightweightChartsFake';
import { makeCandle, makeCandles, T0 } from '../../test/fixtures';

function props(overrides: Partial<TokenChartProps> = {}): TokenChartProps {
  const data = makeCandles();
  return {
    symbol: 'FROG',
    status: 'ready',
    interval: '1m',
    onIntervalChange: () => {},
    candles: data.candles,
    devTrades: data.devTrades,
    totalSupply: data.totalSupply,
    solUsd: 140,
    connection: 'connected',
    errorMessage: null,
    onRetry: () => {},
    ...overrides,
  };
}

describe('TokenChart', () => {
  it('draws candles and volume in SOL, coloring volume by the dominant side, with the attribution logo', () => {
    render(<TokenChart {...props()} />);

    expect(screen.getByRole('img', { name: 'Price of FROG in SOL, 1m candles, 2 candles' })).toBeInTheDocument();
    const chart = lastChart();
    expect(chart.options).toMatchObject({ layout: { attributionLogo: true }, autoSize: true });
    expect(chart.candles().data).toEqual([
      { time: T0, open: 0.00000003, high: 0.00000004, low: 0.00000002, close: 0.000000035 },
      { time: T0 + 60, open: 0.000000035, high: 0.00000004, low: 0.00000002, close: 0.00000003 },
    ]);
    expect(screen.getByText(/TradingView Lightweight Charts™, Copyright/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'tradingview.com' })).toHaveAttribute('href', 'https://www.tradingview.com/');
    const [buyBar, sellBar] = chart.volume().data;
    expect(buyBar).toMatchObject({ time: T0, value: 3, color: 'rgba(10, 107, 75, 0.5)' });
    expect(sellBar).toMatchObject({ time: T0 + 60, value: 3, color: 'rgba(174, 35, 24, 0.5)' });
  });

  it('marks dev trades on their candles', () => {
    render(<TokenChart {...props({ devTrades: [{ time: T0 + 70, side: 'sell', solAmount: 2 }, { time: T0 + 10, side: 'buy', solAmount: 1 }] })} />);

    expect(lastChart().candles().markers).toEqual([
      expect.objectContaining({ time: T0, position: 'belowBar', shape: 'arrowUp', text: 'Dev buy 1 SOL' }),
      expect.objectContaining({ time: T0 + 60, position: 'aboveBar', shape: 'arrowDown', text: 'Dev sell 2 SOL' }),
    ]);
  });

  it('shows OHLC and volume for the last candle, and for the hovered one', () => {
    render(<TokenChart {...props()} />);
    const legend = document.querySelector<HTMLElement>('.token-chart__legend')!;

    expect(within(legend).getByText('0.0₇3 SOL (−14.3%)')).toBeInTheDocument();
    expect(within(legend).getByText('3.00 SOL')).toBeInTheDocument();

    act(() => lastChart().hover(T0));
    expect(within(legend).getByText('0.0₇35 SOL (+16.7%)')).toBeInTheDocument();

    act(() => lastChart().hover(undefined));
    expect(within(legend).getByText('0.0₇3 SOL (−14.3%)')).toBeInTheDocument();
  });

  it('switches intervals through the interval buttons', async () => {
    const onIntervalChange = vi.fn();
    const user = userEvent.setup();
    render(<TokenChart {...props({ onIntervalChange })} />);

    const group = screen.getByRole('group', { name: 'Candle interval' });
    expect(within(group).getByRole('button', { name: '1m' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '1s' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(within(group).getByRole('button', { name: '5m' }));
    expect(onIntervalChange).toHaveBeenCalledWith('5m');
  });

  it('toggles to market cap (price × total supply) and to USD (× solUsd)', async () => {
    const user = userEvent.setup();
    render(<TokenChart {...props()} />);

    await user.click(screen.getByRole('button', { name: 'Market cap' }));
    expect(screen.getByRole('button', { name: 'Market cap' })).toHaveAttribute('aria-pressed', 'true');
    expect(lastChart().candles().data.at(-1)?.close).toBeCloseTo(30, 9);
    expect(screen.getByText('30.00 SOL (−14.3%)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'USD' }));
    expect(lastChart().candles().data.at(-1)?.close).toBeCloseTo(4200, 6);
    expect(lastChart().volume().data.at(-1)?.value).toBeCloseTo(420, 9);
    expect(screen.getByRole('img', { name: /Market cap of FROG in USD/ })).toBeInTheDocument();
    expect(screen.getByText('$4.2K (−14.3%)')).toBeInTheDocument();
  });

  it('disables USD while the SOL/USD price is unknown', () => {
    render(<TokenChart {...props({ solUsd: null })} />);
    const usd = screen.getByRole('button', { name: 'USD' });
    expect(usd).toBeDisabled();
    expect(usd).toHaveAttribute('title', 'The SOL/USD price is not available right now');
    expect(screen.getByRole('button', { name: 'SOL' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('applies a live change to the last candle with update() instead of replacing the data', () => {
    const base = props();
    const { rerender } = render(<TokenChart {...base} />);
    const series = lastChart().candles();
    const setDataCalls = series.count('setData');

    const [first, second] = base.candles;
    rerender(<TokenChart {...base} candles={[first!, { ...second!, close: 0.00000005, high: 0.00000005 }]} />);
    expect(series.count('setData')).toBe(setDataCalls);
    expect(series.calls.at(-1)).toEqual({
      method: 'update',
      arg: { time: T0 + 60, open: 0.000000035, high: 0.00000005, low: 0.00000002, close: 0.00000005 },
    });

    rerender(
      <TokenChart
        {...base}
        candles={[first!, { ...second!, close: 0.00000005, high: 0.00000005 }, makeCandle({ time: T0 + 120 })]}
      />,
    );
    expect(series.count('setData')).toBe(setDataCalls);
    expect(series.data).toHaveLength(3);
    expect(charts).toHaveLength(1);
  });

  it('shows a friendly empty state before the first trade', () => {
    render(<TokenChart {...props({ candles: [], devTrades: [] })} />);
    expect(screen.getByText('No trades yet')).toBeInTheDocument();
    expect(charts).toHaveLength(0);
  });

  it('shows loading and error states, with a retry', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<TokenChart {...props({ status: 'loading', candles: [] })} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading chart…');

    rerender(<TokenChart {...props({ status: 'error', candles: [], errorMessage: 'Could not reach the API.', onRetry })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the chart');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the API.');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the live connection state', () => {
    const { rerender } = render(<TokenChart {...props({ connection: 'connected' })} />);
    expect(screen.getByText('Live trades')).toBeInTheDocument();
    rerender(<TokenChart {...props({ connection: 'reconnecting' })} />);
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();
  });

  it('removes the chart when unmounted', () => {
    const { unmount } = render(<TokenChart {...props()} />);
    unmount();
    expect(lastChart().removed).toBe(true);
  });
});
