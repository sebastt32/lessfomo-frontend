/**
 * Stand-in for `lightweight-charts` in tests: jsdom has no canvas. It records what the UI
 * asks the chart to do so tests can assert behavior. Registered for every test in setup.ts.
 */

type Options = Record<string, unknown>;
type CrosshairHandler = (param: { time?: number }) => void;

function isPlainObject(value: unknown): value is Options {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merges nested options the way the library's applyOptions does. */
function merge(target: Options, source: Options): Options {
  const result: Options = { ...target };
  for (const [key, value] of Object.entries(source)) {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? merge(current, value) : value;
  }
  return result;
}

export class FakeSeries {
  data: Options[] = [];
  options: Options;
  markers: Options[] = [];
  /** Price lines currently on the series (createPriceLine minus removePriceLine). */
  priceLines: Options[] = [];
  readonly calls: { method: 'setData' | 'update' | 'setMarkers' | 'applyOptions'; arg: unknown }[] = [];

  constructor(
    readonly type: string,
    options: Options = {},
  ) {
    this.options = { ...options };
  }

  setData(data: Options[]): void {
    this.data = [...data];
    this.calls.push({ method: 'setData', arg: data });
  }

  update(bar: Options): void {
    const last = this.data.at(-1);
    if (last && last.time === bar.time) this.data[this.data.length - 1] = bar;
    else this.data.push(bar);
    this.calls.push({ method: 'update', arg: bar });
  }

  applyOptions(options: Options): void {
    this.options = merge(this.options, options);
    this.calls.push({ method: 'applyOptions', arg: options });
  }

  priceScale() {
    return { applyOptions: () => {} };
  }

  createPriceLine(options: Options): Options {
    const line = { ...options };
    this.priceLines.push(line);
    return line;
  }

  removePriceLine(line: Options): void {
    this.priceLines = this.priceLines.filter((candidate) => candidate !== line);
  }

  count(method: FakeSeries['calls'][number]['method']): number {
    return this.calls.filter((call) => call.method === method).length;
  }
}

export class FakeChart {
  readonly series: FakeSeries[] = [];
  removed = false;
  fitted = 0;
  private handlers: CrosshairHandler[] = [];
  private scaleHandlers: (() => void)[] = [];
  /** Pixels per bar and horizontal scroll of the fake time scale. */
  barSpacing = 10;
  scrollPx = 0;
  /** Width of the time scale (the pane without the price axis) and height of the time axis. */
  paneWidth = 600;
  axisHeight = 26;

  constructor(
    readonly container: HTMLElement,
    public options: Options = {},
  ) {}

  addSeries(definition: { type: string }, options?: Options): FakeSeries {
    const series = new FakeSeries(definition.type, options);
    this.series.push(series);
    return series;
  }

  applyOptions(options: Options): void {
    this.options = merge(this.options, options);
  }

  timeScale() {
    const subscribe = (handler: () => void) => {
      this.scaleHandlers.push(handler);
    };
    const unsubscribe = (handler: () => void) => {
      this.scaleHandlers = this.scaleHandlers.filter((h) => h !== handler);
    };
    return {
      fitContent: () => {
        this.fitted += 1;
      },
      applyOptions: () => {},
      options: () => ({ barSpacing: this.barSpacing }),
      width: () => this.paneWidth,
      height: () => this.axisHeight,
      /** Like the library: only times that have a bar map to a coordinate (the bar's center). */
      timeToCoordinate: (time: number) => {
        const index = this.candles().data.findIndex((bar) => bar.time === time);
        return index === -1 ? null : index * this.barSpacing + this.barSpacing / 2 - this.scrollPx;
      },
      subscribeVisibleLogicalRangeChange: subscribe,
      unsubscribeVisibleLogicalRangeChange: unsubscribe,
      subscribeSizeChange: subscribe,
      unsubscribeSizeChange: unsubscribe,
    };
  }

  subscribeCrosshairMove(handler: CrosshairHandler): void {
    this.handlers.push(handler);
  }

  unsubscribeCrosshairMove(handler: CrosshairHandler): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  remove(): void {
    this.removed = true;
  }

  // Test helpers
  candles(): FakeSeries {
    return this.series.find((s) => s.type === 'Candlestick')!;
  }

  volume(): FakeSeries {
    return this.series.find((s) => s.type === 'Histogram')!;
  }

  /** Simulates the reader scrolling the chart by `px` pixels. */
  scroll(px: number): void {
    this.scrollPx += px;
    for (const handler of [...this.scaleHandlers]) handler();
  }

  /** Listeners on the time scale (visible range and size). */
  scaleListenerCount(): number {
    return this.scaleHandlers.length;
  }

  hover(time: number | undefined): void {
    for (const handler of this.handlers) handler(time === undefined ? {} : { time });
  }
}

export const charts: FakeChart[] = [];

export function lastChart(): FakeChart {
  const chart = charts.at(-1);
  if (!chart) throw new Error('No chart was created.');
  return chart;
}

export function resetCharts(): void {
  charts.length = 0;
}

export function createChart(container: HTMLElement, options?: Options): FakeChart {
  const chart = new FakeChart(container, options);
  charts.push(chart);
  return chart;
}

export function createSeriesMarkers(series: FakeSeries, markers: Options[] = []) {
  series.markers = [...markers];
  return {
    setMarkers(next: Options[]) {
      series.markers = [...next];
      series.calls.push({ method: 'setMarkers', arg: next });
    },
    markers: () => series.markers,
    detach: () => {},
  };
}

export const CandlestickSeries = { type: 'Candlestick' };
export const HistogramSeries = { type: 'Histogram' };
export const LineStyle = { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4 } as const;
export const ColorType = { Solid: 'solid', VerticalGradient: 'gradient' } as const;
export const CrosshairMode = { Normal: 0, Magnet: 1, Hidden: 2, MagnetOHLC: 3 } as const;
