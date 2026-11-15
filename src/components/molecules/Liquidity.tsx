import { useId } from 'react';
import type { Liquidity } from '../../api/types';
import { formatCurvePct, formatLiquiditySol } from '../../lib/format';
import { MigratedBadge } from '../atoms/Tag';
import './Liquidity.css';

export interface LiquidityProps {
  /** Missing on backends that do not send liquidity yet. */
  liquidity: Liquidity | null | undefined;
}

/** Compact liquidity for table cells: SOL, then the curve progress or a "Migrated" badge. */
export function LiquidityCell({ liquidity }: LiquidityProps) {
  return (
    <span className="liquidity-cell">
      <span className="liquidity-cell__sol">{formatLiquiditySol(liquidity)}</span>
      {liquidity?.migrated ? (
        <MigratedBadge />
      ) : liquidity && liquidity.bondingCurvePct !== null ? (
        <span className="liquidity-cell__curve">{formatCurvePct(liquidity.bondingCurvePct)} curve</span>
      ) : null}
    </span>
  );
}

/** Liquidity block for the token detail: SOL in the market and a bonding curve progress bar. */
export function LiquidityMeter({ liquidity }: LiquidityProps) {
  const pct = liquidity?.migrated ? 100 : (liquidity?.bondingCurvePct ?? null);
  const clamped = pct === null ? null : Math.min(100, Math.max(0, pct));
  const labelId = useId();

  return (
    <div className="liquidity-meter">
      <div className="liquidity-meter__top">
        <span className="liquidity-meter__label">Liquidity</span>
        <strong className="liquidity-meter__sol">{formatLiquiditySol(liquidity)}</strong>
        {liquidity?.migrated ? <MigratedBadge /> : null}
      </div>
      {clamped === null ? (
        <p className="liquidity-meter__note">
          {liquidity ? 'Bonding curve progress is not known yet.' : 'Liquidity is not reported for this token yet.'}
        </p>
      ) : (
        <div className="liquidity-meter__curve">
          <span id={labelId}>Bonding curve</span>
          <span
            className="liquidity-meter__track"
            role="progressbar"
            aria-labelledby={labelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-valuetext={liquidity?.migrated ? 'Complete, migrated to PumpSwap' : formatCurvePct(clamped)}
          >
            <span className="liquidity-meter__fill" style={{ inlineSize: `${clamped}%` }} />
          </span>
          <span className="liquidity-meter__pct">{formatCurvePct(clamped)}</span>
        </div>
      )}
    </div>
  );
}
