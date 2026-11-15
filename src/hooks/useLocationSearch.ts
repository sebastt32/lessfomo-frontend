import { useSyncExternalStore } from 'react';

/** Fired after navigate() changes the URL; the browser only fires popstate for back/forward. */
const NAVIGATE_EVENT = 'lessfomo:navigate';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const getSearch = () => window.location.search;
const getServerSearch = () => '';

/** The current `location.search`, re-rendering on back/forward and on navigate(). */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, getSearch, getServerSearch);
}

export interface NavigateOptions {
  /** Replace the current history entry instead of adding one. */
  replace?: boolean;
}

/** Changes the query string without reloading. `search` is '' or starts with '?'. */
export function navigate(search: string, { replace = false }: NavigateOptions = {}): void {
  if (search === window.location.search) return;
  const url = `${window.location.pathname}${search}${window.location.hash}`;
  if (replace) window.history.replaceState(window.history.state, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}
