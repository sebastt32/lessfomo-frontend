import type { CyclePhase, Lifecycle, WalletStyle, WalletTier } from '../../api/types';
import { LATE_HINT, PHASE_HINTS, PHASE_LABELS } from '../../lib/cycle';
import { STYLE_HINTS, STYLE_LABELS, TIER_HINTS, TIER_LABELS } from '../../lib/smartWallets';
import './Tag.css';

const LIFECYCLE_LABELS: Record<Lifecycle, string> = { active: 'Activo', dead: 'Inactivo' };
const LIFECYCLE_HINTS: Record<Lifecycle, string> = {
  active: 'Tuvo operaciones en las últimas 24 horas',
  dead: 'Sin operaciones hace 24 horas',
};

export interface LifecycleBadgeProps {
  lifecycle: Lifecycle;
}

/** Whether the token still trades (active) or went quiet for 24 hours (dead). */
export function LifecycleBadge({ lifecycle }: LifecycleBadgeProps) {
  return (
    <span className={`tag tag--${lifecycle}`} title={LIFECYCLE_HINTS[lifecycle]}>
      {LIFECYCLE_LABELS[lifecycle]}
    </span>
  );
}

/** The token left the pump.fun bonding curve and trades on PumpSwap. */
export function MigratedBadge() {
  return (
    <span className="tag tag--migrated" title="Completó la curva de pump.fun y ahora cotiza en PumpSwap">
      Graduado
    </span>
  );
}

export interface WalletTierBadgeProps {
  tier: WalletTier;
  /** Prefix that says which moment the tier describes, e.g. "At entry". */
  prefix?: string;
}

/** A wallet's reputation tier: elite, good or not rated. */
export function WalletTierBadge({ tier, prefix }: WalletTierBadgeProps) {
  return (
    <span className={`tag tag--tier-${tier}`} title={TIER_HINTS[tier]}>
      {prefix ? `${prefix}: ${TIER_LABELS[tier]}` : TIER_LABELS[tier]}
    </span>
  );
}

export interface WalletStyleBadgeProps {
  style: WalletStyle;
  /** Prefix that says which moment the style describes, e.g. "At entry". */
  prefix?: string;
}

/** How a wallet usually trades: conviction (holds), flipper (sells within 2 minutes), mixed or unrated. */
export function WalletStyleBadge({ style, prefix }: WalletStyleBadgeProps) {
  return (
    <span className={`tag tag--style-${style}`} title={STYLE_HINTS[style]}>
      {prefix ? `${prefix}: ${STYLE_LABELS[style]}` : STYLE_LABELS[style]}
    </span>
  );
}

/** The wallet trades so many tokens per hour that it is most likely automated. */
export function BotBadge() {
  return (
    <span className="tag tag--bot" title="Opera 20 o más tokens distintos por hora en promedio: casi seguro es automática">
      Bot
    </span>
  );
}

export interface PhaseBadgeProps {
  phase: CyclePhase;
}

/** Where a token is in its cycle: stable after appearing, exploding (reached 2× its base price) or crashed. */
export function PhaseBadge({ phase }: PhaseBadgeProps) {
  return (
    <span className={`tag tag--phase-${phase}`} title={PHASE_HINTS[phase]}>
      {PHASE_LABELS[phase]}
    </span>
  );
}

/** The token appeared in lessfomo after its price had already doubled from launch. */
export function LateBadge() {
  return (
    <span className="tag tag--late" title={LATE_HINT}>
      Llegó tarde
    </span>
  );
}
