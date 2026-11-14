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

  count(method: FakeSeries['calls'][number]['method']): number {
    return this.calls.filter((call) => call.method === method).length;
  }
}

export class FakeChart {
  readonly series: FakeSeries[] = [];
  removed = false;
  fitted = 0;
  private handlers: CrosshairHandler[] = [];

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
    return {
      fitContent: () => {
        this.fitted += 1;
      },
      applyOptions: () => {},
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
export const ColorType = { Solid: 'solid', VerticalGradient: 'gradient' } as const;
export const CrosshairMode = { Normal: 0, Magnet: 1, Hidden: 2, MagnetOHLC: 3 } as const;
