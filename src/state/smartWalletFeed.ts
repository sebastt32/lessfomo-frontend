import type { Mover, ScreeningView, SmartWalletCounts } from '../api/types';
import type { LiveFeedAction, LiveFeedState } from './liveFeed';

/** Cap per map so a long session does not grow without bound; oldest entries go first. */
export const MAX_TRACKED_MINTS = 1000;

/**
 * Whether the backend reports smart wallets. 'unavailable' means it predates them (a ranking arrived
 * without `smartWallets`); the UI then shows every token unfiltered and says why.
 */
export type SmartWalletSupport = 'unknown' | 'available' | 'unavailable';

export interface SmartWalletFeedState {
  support: SmartWalletSupport;
  /** Latest counts per mint, from rankings and smart-wallet events. */
  counts: Record<string, SmartWalletCounts>;
  /**
   * Lower bound per mint for safety checks the server returned for a `minSmartWallets` request:
   * screenings do not carry counts, but the server only returned tokens with at least that many.
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
  return { ...state, support: 'available', counts: capped(counts) };
}

export function smartWalletFeedReducer(state: SmartWalletFeedState, action: LiveFeedAction): SmartWalletFeedState {
  switch (action.type) {
    case 'movers/loaded':
      return applyRanking(state, action.payload.movers);
    case 'screenings/loaded': {
      const min = action.minSmartWallets;
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
      return { ...state, support: 'available', counts: capped(counts) };
    }
    default:
      return state;
  }
}

/** Best known counts for a mint: the latest reading, never below what the server guaranteed. */
export function selectSmartWalletCounts(
  state: SmartWalletFeedState,
  mint: string,
  own?: SmartWalletCounts,
): SmartWalletCounts | null {
  const known = state.counts[mint] ?? own;
  const floor = state.floor[mint];
  if (!known) return floor === undefined ? null : { count: floor, elite: 0, holding: 0 };
  return floor !== undefined && floor > known.count ? { ...known, count: floor } : known;
}

export interface VisibleList<T> {
  items: readonly T[];
  /** False when smart-wallet data is unavailable and the list is shown unfiltered. */
  filtered: boolean;
  /** Items hidden by the threshold. */
  hidden: number;
}

function filterList<T>(
  items: readonly T[],
  state: SmartWalletFeedState,
  min: number,
  countOf: (item: T) => number,
): VisibleList<T> {
  if (state.support === 'unavailable') return { items, filtered: false, hidden: 0 };
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
    (mover) => selectSmartWalletCounts(state, mover.mint, mover.smartWallets)?.count ?? 0,
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
    (screening) => selectSmartWalletCounts(state, screening.mint)?.count ?? 0,
  );
}
