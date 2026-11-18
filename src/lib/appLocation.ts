/**
 * The app's URL state: which view is open and, for the token view, its mint. The daily record keeps its own
 * `day` parameter (see dailyRecord.ts) and every view shares the conviction filter (smartWalletFilter.ts).
 */

export type AppView = 'live' | 'record' | 'token';

export interface AppLocation {
  view: AppView;
  /** The token shown by the token view; only present there. */
  mint?: string;
}

/** Reads the view and token mint from `location.search`; anything unknown (old History or Insights links too) is Live. */
export function parseAppLocation(search: string): AppLocation {
  const params = new URLSearchParams(search);
  const requested = params.get('view');
  const mint = (params.get('mint') ?? '').trim();
  if (requested === 'record') return { view: 'record' };
  // A token view without a mint has nothing to show.
  if (requested === 'token' && mint !== '') return { view: 'token', mint };
  return { view: 'live' };
}

/** The query string for a location ('' for the live view). */
export function serializeAppLocation({ view, mint }: AppLocation): string {
  if (view === 'record') return '?view=record';
  if (view === 'token' && mint) return `?${new URLSearchParams({ view, mint }).toString()}`;
  return '';
}
