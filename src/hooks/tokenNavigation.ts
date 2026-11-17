import { backTarget, tokenNavigationState, tokenSearch, type BackTarget } from '../lib/tokenLocation';
import { navigate, navigationState } from './useLocationSearch';

/**
 * Opens a token's own view (`?view=token&mint=<mint>`), remembering the current list and its filters in the
 * new history entry so "Back" can return to them. The browser's Back button works too: it is a real entry.
 */
export function openToken(mint: string): void {
  const from = window.location.search;
  navigate(tokenSearch(mint, from), { state: tokenNavigationState(from) });
}

/** Where "Back" goes from the token view shown at `search`: the remembered list, or the live view. */
export function currentBackTarget(search: string): BackTarget {
  return backTarget(navigationState(), search);
}
