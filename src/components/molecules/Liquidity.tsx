import { useId } from 'react';
import type { Liquidity } from '../../api/types';
import { formatCurvePct } from '../../lib/format';
import { MigratedBadge } from '../atoms/Tag';
import { HelpTip } from './HelpTip';
import { MoneyValue } from './MoneyValue';
import './Liquidity.css';

export interface LiquidityProps {
  /** Missing on backends that do not send liquidity yet. */
  liquidity: Liquidity | null | undefined;
}

/** Compact liquidity for table cells: dollars (SOL below), then the curve progress or a "Graduado" badge. */
export function LiquidityCell({ liquidity }: LiquidityProps) {
  return (
    <span className="liquidity-cell">
      <MoneyValue sol={liquidity?.sol ?? null} />
      {liquidity?.migrated ? (
        <MigratedBadge />
      ) : liquidity && liquidity.bondingCurvePct !== null ? (
        <span className="liquidity-cell__curve">{formatCurvePct(liquidity.bondingCurvePct)} de la curva</span>
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
        <span className="liquidity-meter__label">
          Liquidez
          <HelpTip topic="la liquidez">
            El dinero disponible en el mercado del token para comprar y vender. Con poca liquidez, una venta grande
            hace caer mucho el precio.
          </HelpTip>
        </span>
        <strong className="liquidity-meter__sol">
          <MoneyValue sol={liquidity?.sol ?? null} layout="inline" />
        </strong>
        {liquidity?.migrated ? <MigratedBadge /> : null}
      </div>
      {clamped === null ? (
        <p className="liquidity-meter__note">
          {liquidity ? 'Todavía no se sabe el avance de la curva.' : 'Todavía no hay datos de liquidez de este token.'}
        </p>
      ) : (
        <div className="liquidity-meter__curve">
          <span id={labelId}>Curva de pump.fun</span>
          <HelpTip topic="la curva de pump.fun">
            Cuánto le falta al token para graduarse: al llegar al 100% deja pump.fun y pasa a cotizar en PumpSwap.
          </HelpTip>
          <span
            className="liquidity-meter__track"
            role="progressbar"
            aria-labelledby={labelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-valuetext={liquidity?.migrated ? 'Completa, graduado a PumpSwap' : formatCurvePct(clamped)}
          >
            <span className="liquidity-meter__fill" style={{ inlineSize: `${clamped}%` }} />
          </span>
          <span className="liquidity-meter__pct">{formatCurvePct(clamped)}</span>
        </div>
      )}
    </div>
  );
}
