import './Sparkline.css';

export interface SparklineProps {
  /** Values on a 0-100 scale, oldest first. */
  values: readonly number[];
  /** Accessible description of what the line shows. */
  label: string;
  width?: number;
  height?: number;
}

const PADDING = 3;

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export function Sparkline({ values, label, width = 280, height = 64 }: SparklineProps) {
  const innerWidth = width - PADDING * 2;
  const innerHeight = height - PADDING * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  const coords = values.map((value, index) => {
    const clamped = Math.min(100, Math.max(0, value));
    return [round(PADDING + index * step), round(PADDING + innerHeight - (clamped / 100) * innerHeight)] as const;
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const last = coords.at(-1);
  const baseline = PADDING + innerHeight;
  const area = coords.length > 1 ? `${PADDING},${baseline} ${line} ${round(PADDING + innerWidth)},${baseline}` : '';

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <line className="sparkline__mid" x1={PADDING} x2={width - PADDING} y1={height / 2} y2={height / 2} />
      {area === '' ? null : <polygon className="sparkline__area" points={area} />}
      {coords.length > 1 ? <polyline className="sparkline__line" points={line} /> : null}
      {last ? <circle className="sparkline__dot" cx={last[0]} cy={last[1]} r={3} /> : null}
    </svg>
  );
}
