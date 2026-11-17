/**
 * Color theme: follow the system, or force light or dark. An explicit choice is kept in
 * localStorage and applied as `data-theme` on <html>; index.html applies it before first paint.
 */

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'lessfomo:theme';

/** Fired on window after the theme changes, for canvas charts that read colors from CSS. */
export const THEME_CHANGE_EVENT = 'lessfomo:themechange';

export function parseTheme(raw: string | null): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

/** The remembered choice; "system" when nothing is stored or storage is unavailable. */
export function readStoredTheme(): ThemeChoice {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    if (choice === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Private mode or blocked storage: the choice still applies for this visit.
  }
}

export function applyTheme(choice: ThemeChoice, root: HTMLElement = document.documentElement): void {
  if (choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', choice);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}
