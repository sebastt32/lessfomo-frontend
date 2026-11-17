import type { TokenCycle } from '../../api/types';
import { CYCLE_UNAVAILABLE, investWindowCompact, investWindowSentence } from '../../lib/cycle';
import { PhaseBadge } from '../atoms/Tag';
import './CycleCell.css';

export interface CycleCellProps {
  /** null or undefined when unknown (the backend may not report cycles yet). */
  cycle: TokenCycle | null | undefined;
  /** Reference time (ms since epoch), for tokens that are still stable. */
  now: number;
}

/** A token's cycle in a list: its phase and, compactly, how long it could be bought before the run-up. */
export function CycleCell({ cycle, now }: CycleCellProps) {
  if (!cycle) {
    return (
      <span className="cycle-cell cycle-cell--unknown" title={CYCLE_UNAVAILABLE}>
        —
      </span>
    );
  }
  return (
    <span className="cycle-cell" title={investWindowSentence(cycle, now)}>
      <PhaseBadge phase={cycle.phase} />
      <span className="cycle-cell__window">{investWindowCompact(cycle, now)}</span>
    </span>
  );
}
