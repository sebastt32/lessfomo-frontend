import type { Lifecycle } from '../../api/types';
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
