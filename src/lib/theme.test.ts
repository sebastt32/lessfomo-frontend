import { afterEach, describe, expect, it, vi } from 'vitest';
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, applyTheme, parseTheme, readStoredTheme, storeTheme } from './theme';

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('parseTheme', () => {
  it('accepts light and dark and treats anything else as following the system', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    for (const other of [null, '', 'system', 'DARK', 'blue']) expect(parseTheme(other)).toBe('system');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for an explicit choice and removes it to follow the system', () => {
    const root = document.documentElement;

    applyTheme('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('light', root);
    expect(root.getAttribute('data-theme')).toBe('light');
    applyTheme('system', root);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('announces the change so canvas charts can re-read their colors', () => {
    const listener = vi.fn();
    window.addEventListener(THEME_CHANGE_EVENT, listener);

    applyTheme('dark', document.documentElement);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  });
});

describe('stored theme', () => {
  it('remembers an explicit choice and forgets it when following the system', () => {
    storeTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');

    storeTheme('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readStoredTheme()).toBe('system');
  });

  it('falls back to the system theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredTheme()).toBe('system');
    expect(() => storeTheme('dark')).not.toThrow();
  });
});
