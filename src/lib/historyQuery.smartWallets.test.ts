import { describe, expect, it } from 'vitest';
import { DEFAULT_SORT, parseAppLocation, serializeAppLocation, DEFAULT_HISTORY } from './historyQuery';

describe('history sort by smart wallets', () => {
  it('accepts smartWallets:desc and round-trips it', () => {
    const { history } = parseAppLocation('?view=history&sort=smartWallets:desc');
    expect(history.sort).toEqual({ field: 'smartWallets', direction: 'desc' });
    expect(serializeAppLocation({ view: 'history', history })).toBe('?view=history&sort=smartWallets:desc');
  });

  it('rejects smartWallets:asc, which the API does not support', () => {
    expect(parseAppLocation('?view=history&sort=smartWallets:asc').history.sort).toEqual(DEFAULT_SORT);
  });

  it('opens the insights view', () => {
    expect(parseAppLocation('?view=insights')).toEqual({ view: 'insights', history: DEFAULT_HISTORY });
    expect(serializeAppLocation({ view: 'insights', history: DEFAULT_HISTORY })).toBe('?view=insights');
  });
});
