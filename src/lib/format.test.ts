import { describe, expect, it } from 'vitest';
import {
  formatComponent,
  formatCount,
  formatPercent,
  formatPriceSol,
  formatRelativeTime,
  formatScore,
  formatSignedPercent,
  formatSol,
  shortenMint,
} from './format';
import { dexscreenerUrl, pumpFunUrl } from './links';

const NOW = Date.parse('2026-11-13T20:10:00.000Z');

describe('formatRelativeTime', () => {
  it.each([
    ['2026-11-13T20:09:58.000Z', 'just now'],
    ['2026-11-13T20:09:30.000Z', '30s ago'],
    ['2026-11-13T20:07:00.000Z', '3m ago'],
    ['2026-11-13T18:10:00.000Z', '2h ago'],
    ['2026-11-10T20:10:00.000Z', '3d ago'],
    ['2026-11-13T20:10:30.000Z', 'just now'],
  ])('%s -> %s', (iso, expected) => {
    expect(formatRelativeTime(iso, NOW)).toBe(expected);
  });

  it('returns a dash for an unparsable date', () => {
    expect(formatRelativeTime('nope', NOW)).toBe('—');
  });
});

describe('number formatting', () => {
  it('formats percentages and nulls', () => {
    expect(formatPercent(22.456)).toBe('22.5%');
    expect(formatPercent(null)).toBe('—');
  });

  it('formats signed percentages with a real minus sign', () => {
    expect(formatSignedPercent(18.25)).toBe('+18.3%');
    expect(formatSignedPercent(-4)).toBe('−4.0%');
    expect(formatSignedPercent(0)).toBe('0.0%');
  });

  it('formats scores, components, counts and SOL amounts', () => {
    expect(formatScore(72.4)).toBe('72');
    expect(formatComponent(0.6)).toBe('0.60');
    expect(formatCount(1543)).toBe('1,543');
    expect(formatCount(null)).toBe('—');
    expect(formatSol(1.5)).toBe('1.50 SOL');
    expect(formatPriceSol(0.0000321)).toBe('0.0000321 SOL');
    expect(formatPriceSol(null)).toBe('—');
  });

  it('shortens mints for display', () => {
    expect(shortenMint('7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr')).toBe('7GCi…W2hr');
    expect(shortenMint('short')).toBe('short');
  });
});

describe('external links', () => {
  it('builds DexScreener and pump.fun URLs for a mint', () => {
    expect(dexscreenerUrl('abc')).toBe('https://dexscreener.com/solana/abc');
    expect(pumpFunUrl('abc')).toBe('https://pump.fun/coin/abc');
  });
});
