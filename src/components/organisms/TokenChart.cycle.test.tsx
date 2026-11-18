import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { cycleMarks, investWindowRange } from '../../lib/cycle';
import { isoAt, makeCandleCycle, makeCandles, makeMinuteCandles, makeStableCycle, T0 } from '../../test/fixtures';
import { lastChart } from '../../test/lightweightChartsFake';
import { TokenChart, type TokenChartProps } from './TokenChart';

const NOW = (T0 + 840) * 1000;
const ALL_MINUTES = Array.from({ length: 16 }, (_, minute) => minute);

function props(overrides: Partial<TokenChartProps> = {}): TokenChartProps {
  const cycle = makeCandleCycle();
  return {
    symbol: 'FROG',
    status: 'ready',
    interval: '1m',
    onIntervalChange: () => {},
    candles: makeMinuteCandles(...ALL_MINUTES),
    devTrades: [],
    totalSupply: 1_000_000_000,
    solUsd: 140,
    connection: 'connected',
    onRetry: () => {},
    marks: cycleMarks(isoAt(T0), cycle),
    investRange: investWindowRange(cycle, NOW),
    basePriceSol: cycle.appearedPriceSol,
    // These tests check the conversions from the raw price in SOL; the default view is tested on its own.
    initialMetric: 'price',
    initialCurrency: 'SOL',
    ...overrides,
  };
}

const shade = () => document.querySelector<HTMLElement>('.candlestick-chart__shade')!;
const legend = () => screen.getByRole('heading', { name: 'Marcas en el gráfico' }).parentElement!;

describe('TokenChart: cycle marks', () => {
  it('offers the 15m and 1h intervals', async () => {
    const onIntervalChange = vi.fn();
    render(<TokenChart {...props({ onIntervalChange })} />);
    const group = screen.getByRole('group', { name: 'Intervalo de velas' });
    expect(within(group).getAllByRole('button').map((button) => button.textContent)).toEqual([
      '1s',
      '1m',
      '5m',
      '15m',
      '1h',
    ]);
    await userEvent.setup().click(within(group).getByRole('button', { name: '1h' }));
    expect(onIntervalChange).toHaveBeenCalledWith('1h');
  });

  it('marks created, appeared, run-up, doubling, peak and crash on their candles', () => {
    render(<TokenChart {...props()} />);
    expect(lastChart().candles().markers).toEqual([
      expect.objectContaining({ time: T0, text: 'Creado', position: 'belowBar', shape: 'circle' }),
      expect.objectContaining({ time: T0 + 120, text: 'Apareció', position: 'belowBar', shape: 'arrowUp' }),
      expect.objectContaining({ time: T0 + 480, text: 'Subida', position: 'belowBar' }),
      expect.objectContaining({ time: T0 + 540, text: 'Se duplica', position: 'aboveBar' }),
      expect.objectContaining({ time: T0 + 720, text: 'Pico', position: 'aboveBar', shape: 'arrowDown' }),
      expect.objectContaining({ time: T0 + 900, text: 'Caída', position: 'aboveBar', shape: 'arrowDown' }),
    ]);
  });

  it('keeps dev trades among the cycle marks, in time order', () => {
    render(<TokenChart {...props({ devTrades: [{ time: T0 + 200, side: 'sell', solAmount: 2 }] })} />);
    expect(lastChart().candles().markers.map((marker) => marker.text)).toEqual([
      'Creado',
      'Apareció',
      'Creador vende 2 SOL',
      'Subida',
      'Se duplica',
      'Pico',
      'Caída',
    ]);
  });

  it('draws the base price as a line, in the units the chart shows', async () => {
    const user = userEvent.setup();
    render(<TokenChart {...props()} />);
    expect(lastChart().candles().priceLines).toEqual([
      expect.objectContaining({ price: 0.00000003, title: 'Precio al aparecer' }),
    ]);

    await user.click(screen.getByRole('button', { name: 'Market cap' }));
    expect(lastChart().candles().priceLines).toHaveLength(1);
    expect(lastChart().candles().priceLines[0]?.price).toBeCloseTo(30, 9);
  });

  it('shades the invest window over its candles and follows scroll and zoom', () => {
    render(<TokenChart {...props()} />);
    // Bars are 10 px wide in the fake: minute 2 starts at 20 px, minute 8 ends at 90 px.
    expect(shade()).not.toHaveAttribute('hidden');
    expect(shade().style.left).toBe('20px');
    expect(shade().style.width).toBe('70px');
    // It stops above the time axis.
    expect(shade().style.bottom).toBe('26px');
    expect(shade()).toHaveAttribute('aria-hidden', 'true');

    act(() => lastChart().scroll(15));
    expect(shade().style.left).toBe('5px');
    expect(shade().style.width).toBe('70px');

    // Scrolled partly out on the left: clipped at the pane's edge.
    act(() => lastChart().scroll(40));
    expect(shade().style.left).toBe('0px');
    expect(shade().style.width).toBe('35px');

    // Scrolled fully out: hidden.
    act(() => lastChart().scroll(200));
    expect(shade()).toHaveAttribute('hidden');
  });

  it('extends the window to the newest candle while the token is still stable', () => {
    const cycle = makeStableCycle({ appearedAt: isoAt(T0 + 120), updatedAt: isoAt(T0 + 120) });
    const view = render(
      <TokenChart
        {...props({
          candles: makeMinuteCandles(0, 1, 2, 3),
          marks: cycleMarks(isoAt(T0), cycle),
          investRange: investWindowRange(cycle, NOW),
        })}
      />,
    );
    expect(shade().style.left).toBe('20px');
    expect(shade().style.width).toBe('20px');
    expect(legend()).toHaveTextContent('a ahora (sigue estable)');

    // A new candle arrives: the window grows with it.
    view.rerender(
      <TokenChart
        {...props({
          candles: makeMinuteCandles(0, 1, 2, 3, 4),
          marks: cycleMarks(isoAt(T0), cycle),
          investRange: investWindowRange(cycle, NOW),
        })}
      />,
    );
    expect(shade().style.width).toBe('30px');
  });

  it('lists every mark with its time under the chart, as text', () => {
    render(<TokenChart {...props()} />);
    const items = within(legend()).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('.cycle-legend__label')?.textContent)).toEqual([
      'Creado',
      'Apareció en lessfomo',
      'Empieza la subida',
      'Se duplica',
      'Pico',
      'Caída',
      'Sombreado: tiempo para comprar',
      'Línea punteada: precio al aparecer',
    ]);
    expect(within(items[1]!).getByText(/\d{2}:\d{2}:\d{2}/)).toHaveAttribute('datetime', isoAt(T0 + 120));
    expect(items[7]).toHaveTextContent('0.0₇3 SOL');
    expect(legend()).not.toHaveTextContent('fuera de las velas cargadas');
  });

  it('keeps marks outside the loaded candles off the chart and says so in the legend', () => {
    // Only minutes 9 to 13 are loaded: creation, appearance and run-up are older, the crash is newer.
    render(<TokenChart {...props({ candles: makeMinuteCandles(9, 10, 11, 12, 13) })} />);
    expect(lastChart().candles().markers.map((marker) => marker.text)).toEqual(['Se duplica', 'Pico']);
    expect(shade()).toHaveAttribute('hidden');

    const items = within(legend()).getAllByRole('listitem');
    const outside = items.filter((item) => item.textContent?.includes('fuera de las velas cargadas'));
    expect(outside.map((item) => item.querySelector('.cycle-legend__label')?.textContent)).toEqual([
      'Creado',
      'Apareció en lessfomo',
      'Empieza la subida',
      'Caída',
      'Sombreado: tiempo para comprar',
    ]);
    expect(screen.getByRole('img', { name: 'Precio de FROG en SOL, velas de 1m, 5 velas' })).toBeInTheDocument();
  });

  it('does not redraw the marks on a live tick that leaves them where they were', () => {
    // Live ticks only replace the candles; everything else keeps its identity, as in the chart's state.
    const stable = props();
    const view = render(<TokenChart {...stable} />);
    const drawn = lastChart().candles().count('setMarkers');
    const candles = makeMinuteCandles(...ALL_MINUTES);
    candles[15] = { ...candles[15]!, close: 0.00000005, trades: 3 };
    view.rerender(<TokenChart {...stable} candles={candles} />);
    expect(lastChart().candles().count('setMarkers')).toBe(drawn);
    expect(lastChart().candles().count('update')).toBe(1);
  });

  it('works without a cycle: no cycle marks, line or shade', () => {
    const data = makeCandles();
    render(
      <TokenChart
        {...props({ candles: data.candles, marks: cycleMarks(isoAt(T0), null), investRange: null, basePriceSol: null })}
      />,
    );
    expect(lastChart().candles().markers.map((marker) => marker.text)).toEqual(['Creado']);
    expect(lastChart().candles().priceLines).toEqual([]);
    expect(shade()).toHaveAttribute('hidden');
    expect(within(legend()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('removes the time-scale listeners with the chart', () => {
    const view = render(<TokenChart {...props()} />);
    const chart = lastChart();
    expect(chart.scaleListenerCount()).toBe(2);
    view.unmount();
    expect(chart.scaleListenerCount()).toBe(0);
    expect(chart.removed).toBe(true);
  });
});
