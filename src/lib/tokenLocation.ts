import { parseAppLocation, type AppView } from './historyQuery';
import { parseMinConvictionWallets, withMinConvictionWallets } from './smartWalletFilter';

/**
 * The token view's place in the URL: `?view=token&mint=<mint>`, plus the conviction filter that every
 * view shares. Where the reader came from is not in the URL (it would make links unshareable): it travels
 * in the browser's history entry, so "Back" can return to the same list with the same filters.
 */

export const TOKEN_VIEW_PARAM = 'token';

/** Search for a token's own view, keeping only the conviction filter of the current URL. */
export function tokenSearch(mint: string, currentSearch: string): string {
  const params = new URLSearchParams({ view: TOKEN_VIEW_PARAM, mint });
  return withMinConvictionWallets(`?${params.toString()}`, parseMinConvictionWallets(currentSearch));
}

/** What the token view remembers in its history entry. */
export interface TokenNavigationState {
  /** `location.search` of the list the token was opened from. */
  from: string;
}

export function tokenNavigationState(fromSearch: string): TokenNavigationState {
  return { from: fromSearch };
}

/** The remembered search from a history entry's state, if it looks like one of this app's list views. */
function rememberedSearch(state: unknown): string | null {
  const from =
    typeof state === 'string'
      ? state
      : typeof state === 'object' && state !== null
        ? (state as { from?: unknown }).from
        : null;
  if (typeof from !== 'string') return null;
  if (from !== '' && !from.startsWith('?')) return null;
  return parseAppLocation(from).view === 'token' ? null : from;
}

const VIEW_NAMES: Record<Exclude<AppView, 'token'>, string> = {
  live: 'Live',
  history: 'History',
  insights: 'Insights',
};

export interface BackTarget {
  /** '' (the live view) or a search starting with '?'. */
  search: string;
  /** "Back to History". */
  label: string;
}

/**
 * Where "Back" goes from the token view: the list the reader came from (`from`: the remembered search or
 * the history entry's state), or the live view when the token was opened directly. The conviction filter
 * of the current URL wins, since it applies to every view.
 */
export function backTarget(from: unknown, currentSearch: string): BackTarget {
  const remembered = rememberedSearch(from) ?? '';
  const search = withMinConvictionWallets(remembered, parseMinConvictionWallets(currentSearch));
  const view = parseAppLocation(search).view;
  return { search, label: `Back to ${VIEW_NAMES[view === 'token' ? 'live' : view]}` };
}
