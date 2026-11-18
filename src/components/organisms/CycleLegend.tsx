import { MARK_HINTS, type PlacedMark } from '../../lib/cycle';
import { formatDate, formatTimeWithSeconds } from '../../lib/format';
import './CycleLegend.css';

export interface CycleLegendProps {
  /** The cycle's moments, oldest first; `candleTime` null means the moment is not on the loaded candles. */
  marks: readonly PlacedMark[];
  /** Whether candles are on screen: only then can a mark be "outside" them. */
  chartShown: boolean;
  /** The invest window, when the token has one. `onChart` is false when none of it is loaded. */
  window?: { from: string; to: string | null; onChart: boolean } | null;
  /** The price when the token appeared, as shown on the chart's axis, e.g. "0.0₇3 SOL". */
  basePrice?: string | null;
}

function Moment({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={iso}>
      {formatDate(iso)} {formatTimeWithSeconds(iso)}
    </time>
  );
}

const OUTSIDE = 'fuera de las velas cargadas';

/** The chart's marks as text: what each one means and when it happened. Presentational. */
export function CycleLegend({ marks, chartShown, window = null, basePrice = null }: CycleLegendProps) {
  if (marks.length === 0) return null;
  return (
    <div className="cycle-legend">
      <h3 className="cycle-legend__title">Marcas en el gráfico</h3>
      <ul className="cycle-legend__list">
        {marks.map((mark) => (
          <li key={mark.kind} className="cycle-legend__item" title={MARK_HINTS[mark.kind]}>
            <span className={`cycle-legend__swatch cycle-legend__swatch--${mark.kind}`} aria-hidden="true" />
            <span className="cycle-legend__label">{mark.label}</span>
            <Moment iso={mark.at} />
            {chartShown && mark.candleTime === null ? <span className="cycle-legend__off">{OUTSIDE}</span> : null}
          </li>
        ))}
        {window ? (
          <li className="cycle-legend__item" title="El tiempo en que se pudo comprar el token antes de su subida">
            <span className="cycle-legend__swatch cycle-legend__swatch--window" aria-hidden="true" />
            <span className="cycle-legend__label">Sombreado: tiempo para comprar</span>
            <span>
              <Moment iso={window.from} /> a {window.to === null ? 'ahora (sigue estable)' : <Moment iso={window.to} />}
            </span>
            {chartShown && !window.onChart ? <span className="cycle-legend__off">{OUTSIDE}</span> : null}
          </li>
        ) : null}
        {basePrice ? (
          <li className="cycle-legend__item" title="Precio del token cuando apareció en lessfomo">
            <span className="cycle-legend__swatch cycle-legend__swatch--base" aria-hidden="true" />
            <span className="cycle-legend__label">Línea punteada: precio al aparecer</span>
            <span>{basePrice}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
