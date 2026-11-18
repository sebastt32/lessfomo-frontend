import { useCallback, useEffect, useRef, useState } from 'react';
import { THEME_CHANGE_EVENT } from '../../lib/theme';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  CrosshairMode,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { formatChartNumber, type ChartBar, type DevMarker } from '../../lib/candles';
import type { CycleMarkKind } from '../../lib/cycle';
import './CandlestickChart.css';

export interface CandlestickChartProps {
  /** Oldest first, already converted to the selected view. */
  bars: readonly ChartBar[];
  markers: readonly DevMarker[];
  /** Show seconds on the time axis (1s candles). */
  secondsVisible: boolean;
  /** Text alternative for the canvas. */
  label: string;
  /** Called with the hovered bar time, or null when the pointer leaves the bars. */
  onHover: (time: number | null) => void;
  /** Moments of the token's cycle, each on the time of a loaded bar, oldest first. */
  marks?: readonly ChartMark[];
  /** A horizontal reference line, e.g. the base price, in the chart's units. */
  priceLine?: ChartPriceLine | null;
  /** A time range to shade (bar times of its first and last bar), e.g. the invest window. */
  shade?: ChartShade | null;
}

export interface ChartMark {
  /** Time of the bar the mark sits on. */
  time: number;
  kind: CycleMarkKind;
  text: string;
}

export interface ChartPriceLine {
  price: number;
  title: string;
}

export interface ChartShade {
  from: number;
  to: number;
}

interface ChartColors {
  up: string;
  down: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  caution: string;
  font: string;
}

const FALLBACK_COLORS: ChartColors = {
  up: '#0a6b4b',
  down: '#ae2318',
  ink: '#17222b',
  muted: '#56636d',
  line: '#d3dad5',
  accent: '#2440c8',
  caution: '#7f5200',
  font: 'system-ui, sans-serif',
};

const DARK_QUERY = '(prefers-color-scheme: dark)';


/** Reads the design tokens the chart needs from the element's computed style. */
function readColors(element: HTMLElement): ChartColors {
  const style = getComputedStyle(element);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    up: token('--color-up', FALLBACK_COLORS.up),
    down: token('--color-down', FALLBACK_COLORS.down),
    ink: token('--color-ink', FALLBACK_COLORS.ink),
    muted: token('--color-muted', FALLBACK_COLORS.muted),
    line: token('--color-line', FALLBACK_COLORS.line),
    accent: token('--color-accent', FALLBACK_COLORS.accent),
    caution: token('--color-caution', FALLBACK_COLORS.caution),
    font: token('--font-body', FALLBACK_COLORS.font),
  };
}

function sameColors(a: ChartColors, b: ChartColors): boolean {
  return (Object.keys(a) as (keyof ChartColors)[]).every((key) => a[key] === b[key]);
}

function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) return color;
  const [r, g, b] = match.slice(1).map((hex) => parseInt(hex, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sameBar(a: ChartBar | undefined, b: ChartBar | undefined): boolean {
  return (
    a !== undefined &&
    b !== undefined &&
    a.time === b.time &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume &&
    a.side === b.side
  );
}

/** True when only the last bar changed or one bar was appended, so `update` is enough. */
export function isTailUpdate(prev: readonly ChartBar[], next: readonly ChartBar[]): boolean {
  if (prev.length === 0) return false;
  const grown = next.length - prev.length;
  if (grown !== 0 && grown !== 1) return false;
  if (prev.length > 1 && !sameBar(prev[0], next[0])) return false;
  if (prev.length >= 2 && !sameBar(prev[prev.length - 2], next[prev.length - 2])) return false;
  if (grown === 1 && !sameBar(prev.at(-1), next[prev.length - 1])) return false;
  return true;
}

const asTime = (time: number) => time as UTCTimestamp;

function formatLocalTime(time: Time, withSeconds: boolean): string {
  if (typeof time !== 'number') return '';
  // Spanish 24-hour clock, like every other time in the app, whatever the browser's language.
  return new Date(time * 1000).toLocaleTimeString('es', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

interface MarkStyle {
  position: 'belowBar' | 'aboveBar';
  shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown';
  color: 'up' | 'down' | 'muted' | 'accent' | 'caution';
}

/** Cycle marks: what led up to the move sits below the bars, what came of it above. */
const MARK_STYLES: Record<CycleMarkKind, MarkStyle> = {
  created: { position: 'belowBar', shape: 'circle', color: 'muted' },
  appeared: { position: 'belowBar', shape: 'arrowUp', color: 'accent' },
  runStart: { position: 'belowBar', shape: 'circle', color: 'caution' },
  explosion: { position: 'aboveBar', shape: 'square', color: 'up' },
  peak: { position: 'aboveBar', shape: 'arrowDown', color: 'up' },
  crash: { position: 'aboveBar', shape: 'arrowDown', color: 'down' },
};

const NO_MARKS: readonly ChartMark[] = [];

interface ChartRefs {
  chart: IChartApi;
  candles: ISeriesApi<'Candlestick'>;
  volume: ISeriesApi<'Histogram'>;
  markers: ISeriesMarkersPluginApi<Time>;
}

/**
 * Candles with a volume histogram, drawn by TradingView Lightweight Charts.
 * Live changes to the last bar go through `update`; anything else replaces the data.
 */
export function CandlestickChart({
  bars,
  markers,
  secondsVisible,
  label,
  onHover,
  marks = NO_MARKS,
  priceLine = null,
  shade = null,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const shadeBounds = useRef<ChartShade | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const refs = useRef<ChartRefs | null>(null);
  const previous = useRef<{ bars: readonly ChartBar[]; colors: ChartColors | null }>({ bars: [], colors: null });
  const onHoverRef = useRef(onHover);
  const [colors, setColors] = useState<ChartColors>(FALLBACK_COLORS);

  useEffect(() => {
    onHoverRef.current = onHover;
  }, [onHover]);

  /**
   * Moves the shaded range over its bars. The library draws on a canvas, so the range is an element laid
   * over the pane and positioned from the time scale; it follows scroll, zoom, resize and new bars.
   */
  const positionShade = useCallback(() => {
    const element = shadeRef.current;
    if (!element) return;
    const chart = refs.current;
    const bounds = shadeBounds.current;
    const scale = chart?.chart.timeScale();
    const start = scale && bounds ? scale.timeToCoordinate(asTime(bounds.from)) : null;
    const end = scale && bounds ? scale.timeToCoordinate(asTime(bounds.to)) : null;
    if (!scale || start === null || end === null) {
      element.hidden = true;
      return;
    }
    // Coordinates are bar centers: widen by half a bar so the first and last bars are covered.
    const half = scale.options().barSpacing / 2;
    const left = Math.max(0, Math.min(start, end) - half);
    const right = Math.min(scale.width(), Math.max(start, end) + half);
    if (right <= left) {
      element.hidden = true;
      return;
    }
    element.hidden = false;
    element.style.left = `${left}px`;
    element.style.width = `${right - left}px`;
    element.style.bottom = `${scale.height()}px`;
  }, []);

  // Create the chart once; it sizes itself to the container (autoSize uses a ResizeObserver).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        // Required by the Lightweight Charts license: keep the TradingView attribution.
        attributionLogo: true,
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.28 } },
      timeScale: { timeVisible: true, rightOffset: 4 },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      borderVisible: false,
      priceFormat: { type: 'custom', formatter: formatChartNumber, minMove: 1e-12 },
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'custom', formatter: formatChartNumber, minMove: 1e-12 },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
    refs.current = { chart, candles, volume, markers: createSeriesMarkers(candles, []) };

    const handleCrosshair = (param: MouseEventParams<Time>) => {
      onHoverRef.current(typeof param.time === 'number' ? param.time : null);
    };
    chart.subscribeCrosshairMove(handleCrosshair);
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(positionShade);
    timeScale.subscribeSizeChange(positionShade);

    // Follow the light/dark design tokens.
    const media = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null;
    const syncColors = () => {
      const next = readColors(container);
      setColors((current) => (sameColors(current, next) ? current : next));
    };
    syncColors();
    media?.addEventListener('change', syncColors);
    window.addEventListener(THEME_CHANGE_EVENT, syncColors);

    return () => {
      media?.removeEventListener('change', syncColors);
      window.removeEventListener(THEME_CHANGE_EVENT, syncColors);
      chart.unsubscribeCrosshairMove(handleCrosshair);
      timeScale.unsubscribeVisibleLogicalRangeChange(positionShade);
      timeScale.unsubscribeSizeChange(positionShade);
      priceLineRef.current = null;
      chart.remove();
      refs.current = null;
      previous.current = { bars: [], colors: null };
    };
  }, [positionShade]);

  useEffect(() => {
    const chart = refs.current;
    if (!chart) return;
    chart.chart.applyOptions({
      layout: { textColor: colors.muted, fontFamily: colors.font },
      grid: { vertLines: { color: withAlpha(colors.line, 0.5) }, horzLines: { color: withAlpha(colors.line, 0.5) } },
      rightPriceScale: { borderColor: colors.line },
      timeScale: {
        borderColor: colors.line,
        secondsVisible,
        tickMarkFormatter: (time: Time) => formatLocalTime(time, secondsVisible),
      },
      localization: { timeFormatter: (time: Time) => formatLocalTime(time, true) },
    });
    chart.candles.applyOptions({
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
    });
  }, [colors, secondsVisible]);

  useEffect(() => {
    const chart = refs.current;
    if (!chart) return;
    const toCandle = (bar: ChartBar) => ({
      time: asTime(bar.time),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    });
    const toVolume = (bar: ChartBar) => ({
      time: asTime(bar.time),
      value: bar.volume,
      color: withAlpha(bar.side === 'buy' ? colors.up : colors.down, 0.5),
    });

    const prev = previous.current;
    const last = bars.at(-1);
    if (prev.colors === colors && last && isTailUpdate(prev.bars, bars)) {
      chart.candles.update(toCandle(last));
      chart.volume.update(toVolume(last));
    } else {
      chart.candles.setData(bars.map(toCandle));
      chart.volume.setData(bars.map(toVolume));
      if (prev.bars.length === 0 && bars.length > 0) chart.chart.timeScale().fitContent();
    }
    previous.current = { bars, colors };
    // New bars can move the shaded range even when the visible range does not change.
    positionShade();
  }, [bars, colors, positionShade]);

  useEffect(() => {
    const chart = refs.current;
    if (!chart) return;
    const devMarkers = markers.map(
      (marker): SeriesMarker<Time> => ({
        time: asTime(marker.time),
        position: marker.side === 'buy' ? 'belowBar' : 'aboveBar',
        shape: marker.side === 'buy' ? 'arrowUp' : 'arrowDown',
        color: marker.side === 'buy' ? colors.up : colors.down,
        text: marker.text,
      }),
    );
    const cycleMarkers = marks.map((mark): SeriesMarker<Time> => {
      const style = MARK_STYLES[mark.kind];
      return {
        time: asTime(mark.time),
        position: style.position,
        shape: style.shape,
        color: colors[style.color],
        text: mark.text,
      };
    });
    // The library needs markers in time order; the sort is stable, so cycle marks stay in cycle order.
    chart.markers.setMarkers(
      [...cycleMarkers, ...devMarkers].sort((a, b) => (a.time as number) - (b.time as number)),
    );
  }, [markers, marks, colors]);

  const linePrice = priceLine?.price ?? null;
  const lineTitle = priceLine?.title ?? '';
  useEffect(() => {
    const chart = refs.current;
    if (!chart) return;
    if (priceLineRef.current) {
      chart.candles.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (linePrice === null || !Number.isFinite(linePrice)) return;
    priceLineRef.current = chart.candles.createPriceLine({
      price: linePrice,
      title: lineTitle,
      color: colors.accent,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
    });
  }, [linePrice, lineTitle, colors]);

  const shadeFrom = shade?.from ?? null;
  const shadeTo = shade?.to ?? null;
  useEffect(() => {
    shadeBounds.current = shadeFrom === null || shadeTo === null ? null : { from: shadeFrom, to: shadeTo };
    positionShade();
  }, [shadeFrom, shadeTo, positionShade]);

  return (
    <div className="candlestick-chart">
      <div ref={containerRef} className="candlestick-chart__canvas" role="img" aria-label={label} />
      {/* Decorative: the legend under the chart says what the shaded range is, with its times. */}
      <div ref={shadeRef} className="candlestick-chart__shade" aria-hidden="true" hidden />
    </div>
  );
}
