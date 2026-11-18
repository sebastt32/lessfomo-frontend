import { describe, expect, it } from 'vitest';
import { MINT_A } from '../test/fixtures';
import { parseAppLocation, serializeAppLocation } from './appLocation';
import { backTarget, tokenSearch } from './tokenLocation';

describe('token view URL', () => {
  it('builds ?view=token&mint=<mint>, keeping only the conviction filter', () => {
    expect(tokenSearch(MINT_A, '')).toBe(`?view=token&mint=${MINT_A}`);
    expect(tokenSearch(MINT_A, '?view=record&day=2026-11-16&minConvictionWallets=5')).toBe(
      `?view=token&mint=${MINT_A}&minConvictionWallets=5`,
    );
  });

  it('parses the token view and its mint', () => {
    expect(parseAppLocation(`?view=token&mint=${MINT_A}&minConvictionWallets=5`)).toEqual({
      view: 'token',
      mint: MINT_A,
    });
    expect(serializeAppLocation(parseAppLocation(`?view=token&mint=${MINT_A}`))).toBe(`?view=token&mint=${MINT_A}`);
  });

  it('falls back to the live view when the mint is missing', () => {
    expect(parseAppLocation('?view=token')).toEqual({ view: 'live' });
    expect(parseAppLocation('?view=token&mint=%20')).toEqual({ view: 'live' });
  });

  it('opens Live for the removed History and Insights views and anything unknown', () => {
    for (const view of ['history', 'insights', 'bogus']) {
      expect(parseAppLocation(`?view=${view}&page=2`)).toEqual({ view: 'live' });
    }
    expect(serializeAppLocation({ view: 'live' })).toBe('');
  });
});

describe('backTarget', () => {
  it('returns to the view the reader came from', () => {
    const from = '?view=record&day=2026-11-16';
    expect(backTarget(from, `?view=token&mint=${MINT_A}`)).toEqual({ search: from, label: 'Back to Daily record' });
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
    expect(backTarget('?view=record&day=2026-11-16', `?view=token&mint=${MINT_A}&minConvictionWallets=5`)).toEqual({
      search: '?view=record&day=2026-11-16&minConvictionWallets=5',
      label: 'Back to Daily record',
    });
  });

  it('ignores a remembered location that is not a list view', () => {
    expect(backTarget(`?view=token&mint=${MINT_A}`, `?view=token&mint=${MINT_A}`).search).toBe('');
    expect(backTarget(42, `?view=token&mint=${MINT_A}`).search).toBe('');
    expect(backTarget('https://evil.test/', `?view=token&mint=${MINT_A}`).search).toBe('');
  });
});
