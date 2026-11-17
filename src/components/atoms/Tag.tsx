import type { Lifecycle, WalletTier } from '../../api/types';
import { TIER_HINTS, TIER_LABELS } from '../../lib/smartWallets';
import './Tag.css';

const LIFECYCLE_LABELS: Record<Lifecycle, string> = { active: 'Active', dead: 'Dead' };
const LIFECYCLE_HINTS: Record<Lifecycle, string> = {
  active: 'Traded in the last 24 hours',
  dead: 'No trades for 24 hours',
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
    <span className="tag tag--migrated" title="Moved from the pump.fun bonding curve to PumpSwap">
      Migrated
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

/** The wallet trades so many tokens per hour that it is most likely automated. */
export function BotBadge() {
  return (
    <span className="tag tag--bot" title="Trades 20 or more different tokens per hour on average: most likely automated">
      Bot
    </span>
  );
}
