import { describe, expect, it } from 'vitest';
import { MINT_A } from '../test/fixtures';
import {
  DEFAULT_HISTORY,
  hasActiveFilters,
  parseAppLocation,
  serializeAppLocation,
  toTokenListQuery,
} from './historyQuery';
import { backTarget, tokenSearch } from './tokenLocation';

describe('token view URL', () => {
  it('builds ?view=token&mint=<mint>, keeping only the conviction filter', () => {
    expect(tokenSearch(MINT_A, '')).toBe(`?view=token&mint=${MINT_A}`);
    expect(tokenSearch(MINT_A, '?view=history&status=passed&page=3&minConvictionWallets=5')).toBe(
      `?view=token&mint=${MINT_A}&minConvictionWallets=5`,
    );
  });

  it('parses the token view and its mint', () => {
    expect(parseAppLocation(`?view=token&mint=${MINT_A}&minConvictionWallets=5`)).toEqual({
      view: 'token',
      mint: MINT_A,
      history: DEFAULT_HISTORY,
    });
    expect(serializeAppLocation(parseAppLocation(`?view=token&mint=${MINT_A}`))).toBe(`?view=token&mint=${MINT_A}`);
  });

  it('falls back to the live view when the mint is missing', () => {
    expect(parseAppLocation('?view=token')).toEqual({ view: 'live', history: DEFAULT_HISTORY });
    expect(parseAppLocation('?view=token&mint=%20')).toEqual({ view: 'live', history: DEFAULT_HISTORY });
  });
});

describe('backTarget', () => {
  it('returns to the view and filters the reader came from', () => {
    const from = '?view=history&status=passed&sort=investWindow:asc&page=2';
    expect(backTarget(from, `?view=token&mint=${MINT_A}`)).toEqual({ search: from, label: 'Back to History' });
    expect(backTarget('?view=insights&by=conviction', `?view=token&mint=${MINT_A}`)).toEqual({
      search: '?view=insights&by=conviction',
      label: 'Back to Insights',
    });
    expect(backTarget('', `?view=token&mint=${MINT_A}`)).toEqual({ search: '', label: 'Back to Live' });
  });

  it('goes to the live view when the token was opened directly, keeping the conviction filter', () => {
    expect(backTarget(null, `?view=token&mint=${MINT_A}`)).toEqual({ search: '', label: 'Back to Live' });
    expect(backTarget(undefined, `?view=token&mint=${MINT_A}&minConvictionWallets=10`)).toEqual({
      search: '?minConvictionWallets=10',
      label: 'Back to Live',
    });
  });

  it('carries the current conviction filter over the remembered one', () => {
    expect(backTarget('?view=history&page=2', `?view=token&mint=${MINT_A}&minConvictionWallets=5`)).toEqual({
      search: '?view=history&page=2&minConvictionWallets=5',
      label: 'Back to History',
    });
  });

  it('ignores a remembered location that is not a list view', () => {
    expect(backTarget(`?view=token&mint=${MINT_A}`, `?view=token&mint=${MINT_A}`).search).toBe('');
    expect(backTarget(42, `?view=token&mint=${MINT_A}`).search).toBe('');
    expect(backTarget('https://evil.test/', `?view=token&mint=${MINT_A}`).search).toBe('');
  });
});

describe('history cycle filters in the URL', () => {
  it('round-trips phase, appeared late and the new sorts', () => {
    const search = '?view=history&status=passed&phase=stable,crashed&appearedLate=false&sort=investWindow:asc&page=2';
    const location = parseAppLocation(search);
    expect(location.history).toEqual({
      ...DEFAULT_HISTORY,
      status: ['passed'],
      phase: ['stable', 'crashed'],
      appearedLate: false,
      sort: { field: 'investWindow', direction: 'asc' },
      page: 2,
    });
    expect(serializeAppLocation(location)).toBe(search);
    expect(parseAppLocation('?view=history&appearedLate=true&sort=appearedAt:desc').history).toEqual({
      ...DEFAULT_HISTORY,
      appearedLate: true,
      sort: { field: 'appearedAt', direction: 'desc' },
    });
  });

  it('drops invalid values and normalizes the phase order', () => {
    expect(parseAppLocation('?view=history&phase=crashed,bogus,stable,stable&appearedLate=maybe').history).toEqual({
      ...DEFAULT_HISTORY,
      phase: ['stable', 'crashed'],
    });
    expect(parseAppLocation('?view=history&phase=bogus').history).toEqual(DEFAULT_HISTORY);
  });

  it('counts them as active filters and sends them to GET /api/tokens', () => {
    expect(hasActiveFilters({ ...DEFAULT_HISTORY, phase: ['exploding'] })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY, appearedLate: false })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_HISTORY, phase: [] })).toBe(false);
    const now = new Date(2026, 10, 14, 15, 30);
    expect(
      toTokenListQuery(
        { ...DEFAULT_HISTORY, phase: ['exploding'], appearedLate: true, sort: { field: 'appearedAt', direction: 'asc' } },
        now,
      ),
    ).toEqual({
      phase: ['exploding'],
      appearedLate: true,
      sort: { field: 'appearedAt', direction: 'asc' },
      page: 1,
      pageSize: 50,
    });
  });
});
