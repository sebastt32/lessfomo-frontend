import type { Mover, ScreeningView, SmartWalletCounts } from '../api/types';
import type { LiveFeedAction, LiveFeedState } from './liveFeed';

/** Cap per map so a long session does not grow without bound; oldest entries go first. */
export const MAX_TRACKED_MINTS = 1000;

/**
 * Whether the backend reports smart wallets. 'unavailable' means it predates them (a ranking arrived
 * without `smartWallets`); 'no-conviction' means it reports good-history wallets but not how many of them
 * are conviction wallets. In both cases the UI shows the server's list without client-side filtering and
 * says why.
 */
export type SmartWalletSupport = 'unknown' | 'available' | 'no-conviction' | 'unavailable';

export interface SmartWalletFeedState {
  support: SmartWalletSupport;
  /** Latest counts per mint, from rankings and smart-wallet events. */
  counts: Record<string, SmartWalletCounts>;
  /**
   * Lower bound of conviction wallets per mint for safety checks the server returned for a
   * `minConvictionWallets` request: screenings do not carry counts, but the server only returned tokens
   * with at least that many.
   */
  floor: Record<string, number>;
}

export const initialSmartWalletFeedState: SmartWalletFeedState = { support: 'unknown', counts: {}, floor: {} };

function capped<T>(record: Record<string, T>): Record<string, T> {
  const keys = Object.keys(record);
  if (keys.length <= MAX_TRACKED_MINTS) return record;
  return Object.fromEntries(keys.slice(-MAX_TRACKED_MINTS).map((key) => [key, record[key]!]));
}

function applyRanking(state: SmartWalletFeedState, movers: readonly Mover[]): SmartWalletFeedState {
  if (movers.length === 0) return state;
  const withCounts = movers.filter((m) => m.smartWallets !== undefined);
  if (withCounts.length === 0) return state.support === 'unavailable' ? state : { ...state, support: 'unavailable' };
  const counts = { ...state.counts };
  for (const mover of withCounts) {
    delete counts[mover.mint];
    counts[mover.mint] = mover.smartWallets!;
  }
  const support = withCounts.some((m) => hasConviction(m.smartWallets!)) ? 'available' : 'no-conviction';
  return { ...state, support, counts: capped(counts) };
}

function hasConviction(counts: SmartWalletCounts): boolean {
  return typeof counts.conviction === 'number';
}

export function smartWalletFeedReducer(state: SmartWalletFeedState, action: LiveFeedAction): SmartWalletFeedState {
  switch (action.type) {
    case 'movers/loaded':
      return applyRanking(state, action.payload.movers);
    case 'screenings/loaded': {
      const min = action.minConvictionWallets;
      if (min === undefined || min <= 0 || action.payload.screenings.length === 0) return state;
      const floor = { ...state.floor };
      for (const screening of action.payload.screenings) {
        floor[screening.mint] = Math.max(floor[screening.mint] ?? 0, min);
      }
      return { ...state, floor: capped(floor) };
    }
    case 'stream/event': {
      const { event } = action;
      if (event.type === 'momentum') return applyRanking(state, event.data.movers);
      if (event.type !== 'smart-wallet') return state;
      const counts = { ...state.counts };
      delete counts[event.data.mint];
      counts[event.data.mint] = event.data.smartWallets;
      const support = hasConviction(event.data.smartWallets)
        ? 'available'
        : state.support === 'available'
          ? 'available'
          : 'no-conviction';
      return { ...state, support, counts: capped(counts) };
    }
    default:
      return state;
  }
}

/**
 * Best known counts for a mint: the latest reading, never below what the server guaranteed. The floor is
 * in conviction wallets, which are a subset of the good-history ones, so it bounds both counts.
 */
export function selectSmartWalletCounts(
  state: SmartWalletFeedState,
  mint: string,
  own?: SmartWalletCounts,
): SmartWalletCounts | null {
  const known = state.counts[mint] ?? own;
  const floor = state.floor[mint];
  if (!known) return floor === undefined ? null : { count: floor, elite: 0, holding: 0, conviction: floor };
  if (floor === undefined) return known;
  const conviction = Math.max(known.conviction ?? 0, floor);
  const count = Math.max(known.count, conviction);
  return count === known.count && conviction === known.conviction ? known : { ...known, count, conviction };
}

/** Conviction wallets of a mint, as far as the feed knows (0 when unknown). */
function convictionOf(state: SmartWalletFeedState, mint: string, own?: SmartWalletCounts): number {
  return selectSmartWalletCounts(state, mint, own)?.conviction ?? 0;
}

export interface VisibleList<T> {
  items: readonly T[];
  /** False when smart-wallet data is unavailable and the list is shown unfiltered. */
  filtered: boolean;
  /** Items hidden by the conviction threshold. */
  hidden: number;
}

function filterList<T>(
  items: readonly T[],
  state: SmartWalletFeedState,
  min: number,
  countOf: (item: T) => number,
): VisibleList<T> {
  if (state.support === 'unavailable' || state.support === 'no-conviction') {
    return { items, filtered: false, hidden: 0 };
  }
  const visible = items.filter((item) => countOf(item) >= min);
  return { items: visible, filtered: true, hidden: items.length - visible.length };
}

export function selectVisibleMovers(
  feed: LiveFeedState,
  state: SmartWalletFeedState,
  min: number,
): VisibleList<Mover> {
  return filterList(
    feed.movers.items,
    state,
    min,
    (mover) => convictionOf(state, mover.mint, mover.smartWallets),
  );
}

export function selectVisibleScreenings(
  feed: LiveFeedState,
  state: SmartWalletFeedState,
  min: number,
): VisibleList<ScreeningView> {
  return filterList(
    feed.screenings.items,
    state,
    min,
    (screening) => convictionOf(state, screening.mint),
  );
}
