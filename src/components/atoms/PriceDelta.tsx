import { formatSignedPercent } from '../../lib/format';
import './PriceDelta.css';

export interface PriceDeltaProps {
  /** Percentage change, e.g. 18.2 for +18.2%. */
  value: number;
}

export function PriceDelta({ value }: PriceDeltaProps) {
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const glyph = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
  return (
    <span className={`price-delta price-delta--${direction}`}>
      {glyph === '' ? null : (
        <span className="price-delta__glyph" aria-hidden="true">
          {glyph}
        </span>
      )}
      {formatSignedPercent(value)}
    </span>
  );
}
