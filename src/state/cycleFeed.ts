import type { Mover, TokenCycle } from '../api/types';
import { newerCycle } from '../lib/cycle';
import type { LiveFeedAction } from './liveFeed';

/** Cap so a long session does not grow without bound; oldest entries go first. */
export const MAX_TRACKED_CYCLES = 1000;

/**
 * Whether the backend reports token cycles. 'unavailable' means it predates them: a ranking arrived whose
 * movers have no `cycle` field at all (a backend that knows cycles sends the field, null when there is none).
 */
export type CycleSupport = 'unknown' | 'available' | 'unavailable';

export interface CycleFeedState {
  support: CycleSupport;
  /** Latest cycle per mint, from rankings and `cycle` events. */
  cycles: Record<string, TokenCycle>;
}

export const initialCycleFeedState: CycleFeedState = { support: 'unknown', cycles: {} };

function capped(cycles: Record<string, TokenCycle>): Record<string, TokenCycle> {
  const keys = Object.keys(cycles);
  if (keys.length <= MAX_TRACKED_CYCLES) return cycles;
  return Object.fromEntries(keys.slice(-MAX_TRACKED_CYCLES).map((key) => [key, cycles[key]!]));
}

/** Stores `cycle` for `mint` unless a newer reading is already known. */
function withCycle(cycles: Record<string, TokenCycle>, mint: string, cycle: TokenCycle): Record<string, TokenCycle> {
  const known = cycles[mint];
  const next = newerCycle(known, cycle);
  if (next === null || next === known) return cycles;
  const copy = { ...cycles };
  delete copy[mint];
  copy[mint] = next;
  return copy;
}

function applyRanking(state: CycleFeedState, movers: readonly Mover[]): CycleFeedState {
  if (movers.length === 0) return state;
  if (movers.every((mover) => mover.cycle === undefined)) {
    // A `cycle` event already proved support; a ranking without the field cannot take it back.
    return state.support === 'unknown' ? { ...state, support: 'unavailable' } : state;
  }
  let cycles = state.cycles;
  for (const mover of movers) {
    if (mover.cycle) cycles = withCycle(cycles, mover.mint, mover.cycle);
  }
  if (cycles === state.cycles && state.support === 'available') return state;
  return { support: 'available', cycles: capped(cycles) };
}

/** Follows the same actions as the live feed, keeping only what concerns token cycles. */
export function cycleFeedReducer(state: CycleFeedState, action: LiveFeedAction): CycleFeedState {
  switch (action.type) {
    case 'movers/loaded':
      return applyRanking(state, action.payload.movers);
    case 'stream/event': {
      const { event } = action;
      if (event.type === 'momentum') return applyRanking(state, event.data.movers);
      if (event.type !== 'cycle' || !event.data.cycle || typeof event.data.mint !== 'string') return state;
      const cycles = withCycle(state.cycles, event.data.mint, event.data.cycle);
      if (cycles === state.cycles && state.support === 'available') return state;
      return { support: 'available', cycles: capped(cycles) };
    }
    default:
      return state;
  }
}

/** Best known cycle for a mint: the feed's reading or the row's own (`own`), whichever was updated last. */
export function selectCycle(state: CycleFeedState, mint: string, own?: TokenCycle | null): TokenCycle | null {
  return newerCycle(own, state.cycles[mint]);
}
