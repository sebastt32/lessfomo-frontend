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
  toChartValue,
  type ChartBar,
  type ChartCurrency,
  type ChartMetric,
} from '../../lib/candles';
import { placeCycle, type CycleMark, type InvestRange } from '../../lib/cycle';
import { formatSignedPercent } from '../../lib/format';
import { ExternalLink } from '../atoms/ExternalLink';
import { StatusDot, type StatusDotTone } from '../atoms/StatusDot';
import { CandlestickChart, type ChartMark } from '../molecules/CandlestickChart';
import { HelpTip } from '../molecules/HelpTip';
import { SegmentedControl, type SegmentedOption } from '../molecules/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '../molecules/SectionState';
import { CycleLegend } from './CycleLegend';
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
  /** Moments of the token's cycle to mark on the chart and list under it, oldest first. */
  marks?: readonly CycleMark[];
  /** The time the token could be bought, shaded on the chart. */
  investRange?: InvestRange | null;
  /** Price when the token appeared in lessfomo (SOL per token), drawn as a dashed line. */
  basePriceSol?: number | null;
  /** What the chart shows first; market cap in USD by default (SOL while the SOL/USD price is unknown). */
  initialMetric?: ChartMetric;
  initialCurrency?: ChartCurrency;
}

const NO_MARKS: readonly CycleMark[] = [];

/** Short texts for the canvas, where space is tight; the legend under the chart has the full labels. */
const MARK_TEXT: Record<CycleMark['kind'], string> = {
  created: 'Creado',
  appeared: 'Apareció',
  runStart: 'Subida',
  explosion: 'Se duplica',
  peak: 'Pico',
  crash: 'Caída',
};

const INTERVAL_OPTIONS: SegmentedOption<CandleInterval>[] = CANDLE_INTERVALS.map((value) => ({ value, label: value }));

const METRIC_OPTIONS: SegmentedOption<ChartMetric>[] = [
  { value: 'price', label: 'Precio' },
  { value: 'marketCap', label: 'Market cap' },
];

const LIVE_COPY: Record<ConnectionState, { label: string; tone: StatusDotTone }> = {
  connecting: { label: 'Conectando', tone: 'warn' },
  connected: { label: 'Operaciones en vivo', tone: 'good' },
  reconnecting: { label: 'Reconectando', tone: 'warn' },
  offline: { label: 'Sin actualizaciones en vivo', tone: 'bad' },
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
  marks = NO_MARKS,
  investRange = null,
  basePriceSol = null,
  initialMetric = 'marketCap',
  initialCurrency = 'USD',
}: TokenChartProps) {
  // Market cap in dollars first: easier to read than a price per token in SOL. USD falls back to SOL while unknown.
  const [metric, setMetric] = useState<ChartMetric>(initialMetric);
  const [currencyChoice, setCurrency] = useState<ChartCurrency>(initialCurrency);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const currency = effectiveCurrency(currencyChoice, solUsd);

  const bars = useMemo(
    () => convertCandles(candles, { metric, currency, totalSupply, solUsd }),
    [candles, metric, currency, totalSupply, solUsd],
  );
  // Keyed on the first candle time, not the array, so live ticks do not reset the markers.
  const firstTime = candles[0]?.time ?? null;
  const markers = useMemo(() => devTradeMarkers(devTrades, interval, firstTime), [devTrades, interval, firstTime]);

  // Where the cycle falls on the loaded candles. Moments outside them stay off the chart and are only listed.
  const placement = useMemo(
    () =>
      placeCycle(
        marks,
        investRange,
        candles.map((candle) => candle.time),
        interval,
      ),
    [marks, investRange, candles, interval],
  );
  // Keyed on what is drawn, not on the arrays, so live ticks do not redraw unchanged marks.
  const marksKey = placement.marks.map((mark) => `${mark.kind}@${mark.candleTime ?? ''}`).join('|');
  const chartMarks = useMemo(
    () =>
      placement.marks.flatMap((mark): ChartMark[] =>
        mark.candleTime === null ? [] : [{ time: mark.candleTime, kind: mark.kind, text: MARK_TEXT[mark.kind] }],
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marksKey stands for placement.marks
    [marksKey],
  );
  const basePrice =
    basePriceSol === null ? null : toChartValue(basePriceSol, { metric, currency, totalSupply, solUsd });
  const priceLine = useMemo(() => (basePrice === null ? null : { price: basePrice, title: 'Precio al aparecer' }), [basePrice]);

  const currencyOptions: SegmentedOption<ChartCurrency>[] = [
    { value: 'SOL', label: 'SOL' },
    {
      value: 'USD',
      label: 'USD',
      disabled: solUsd === null,
      ...(solUsd === null ? { hint: 'El precio de SOL en USD no está disponible ahora' } : {}),
    },
  ];

  const metricName = metric === 'price' ? 'Precio' : 'Market cap';
  const shown = (hoverTime === null ? undefined : bars.find((bar) => bar.time === hoverTime)) ?? bars.at(-1);
  const live = LIVE_COPY[connection];

  let body;
  if (status === 'loading') {
    body = <LoadingState>Cargando gráfico…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState title="No se pudo cargar el gráfico" onRetry={onRetry} retryLabel="Reintentar">
        {errorMessage}
      </ErrorState>
    );
  } else if (bars.length === 0) {
    body = (
      <EmptyState title="Todavía no hay operaciones">
        El gráfico empieza con la primera operación de este token y se actualiza en vivo, así que puedes dejarlo
        abierto.
      </EmptyState>
    );
  } else {
    body = (
      <CandlestickChart
        bars={bars}
        markers={markers}
        secondsVisible={interval === '1s'}
        label={`${metricName} de ${symbol} en ${currency}, velas de ${interval}, ${bars.length} velas`}
        onHover={setHoverTime}
        marks={chartMarks}
        priceLine={priceLine}
        shade={placement.shade}
      />
    );
  }

  return (
    <section className="token-chart" aria-label={`Gráfico de ${symbol}`}>
      <div className="token-chart__toolbar">
        <SegmentedControl label="Intervalo de velas" options={INTERVAL_OPTIONS} value={interval} onChange={onIntervalChange} />
        <span className="token-chart__choice">
          <SegmentedControl label="Valor del gráfico" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <HelpTip topic="el market cap">
            Lo que valen todos los tokens juntos al precio actual. El precio es lo que vale un solo token. Puedes ver
            cualquiera de los dos en USD o en SOL.
          </HelpTip>
        </span>
        <SegmentedControl label="Moneda" options={currencyOptions} value={currency} onChange={setCurrency} />
        <span className="token-chart__live">
          <StatusDot tone={live.tone} />
          {live.label}
        </span>
      </div>

      {shown && status === 'ready' ? (
        <dl className="token-chart__legend" aria-label={`${metricName} en ${currency}`}>
          <div>
            <dt>
              <abbr title="Apertura">A</abbr>
            </dt>
            <dd>{formatChartNumber(shown.open)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="Máximo">Máx</abbr>
            </dt>
            <dd>{formatChartNumber(shown.high)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="Mínimo">Mín</abbr>
            </dt>
            <dd>{formatChartNumber(shown.low)}</dd>
          </div>
          <div>
            <dt>
              <abbr title="Cierre">C</abbr>
            </dt>
            <dd className={shown.close >= shown.open ? 'token-chart__up' : 'token-chart__down'}>
              {formatChartValue(shown.close, currency)} ({formatSignedPercent(changePercent(shown))})
            </dd>
          </div>
          <div>
            <dt>
              <abbr title="Volumen">Vol</abbr>
            </dt>
            <dd>{formatChartValue(shown.volume, currency)}</dd>
          </div>
        </dl>
      ) : null}

      {body}

      <CycleLegend
        marks={placement.marks}
        chartShown={status === 'ready' && bars.length > 0}
        window={
          investRange
            ? {
                from: new Date(investRange.from * 1000).toISOString(),
                to: investRange.open ? null : new Date(investRange.to * 1000).toISOString(),
                onChart: placement.shade !== null,
              }
            : null
        }
        basePrice={basePrice === null ? null : `${formatChartValue(basePrice, currency)} (${metricName.toLowerCase()})`}
      />

      {/* Attribution notice required by the Lightweight Charts license (its NOTICE file). */}
      <p className="token-chart__notice">
        Gráfico hecho con TradingView Lightweight Charts™, Copyright (с) 2025 TradingView, Inc.{' '}
        <ExternalLink href="https://www.tradingview.com/">tradingview.com</ExternalLink>
      </p>
    </section>
  );
}
