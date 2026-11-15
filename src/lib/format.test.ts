import { describe, expect, it } from 'vitest';
import {
  formatComponent,
  formatCount,
  formatCurvePct,
  formatDate,
  formatLiquiditySol,
  formatSolAmount,
  formatTime,
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

describe('liquidity, SOL amounts and dates', () => {
  it('formats SOL amounts with nulls and grouping', () => {
    expect(formatSolAmount(null)).toBe('—');
    expect(formatSolAmount(12.345)).toBe('12.35 SOL');
    expect(formatSolAmount(0.004)).toBe('0.004 SOL');
    expect(formatSolAmount(1234.5)).toBe('1,235 SOL');
  });

  it('formats liquidity, tolerating a backend that does not send it yet', () => {
    expect(formatLiquiditySol(undefined)).toBe('—');
    expect(formatLiquiditySol({ sol: null, bondingCurvePct: null, migrated: false })).toBe('—');
    expect(formatLiquiditySol({ sol: 42.1, bondingCurvePct: 50, migrated: false })).toBe('42.10 SOL');
    expect(formatCurvePct(64.4)).toBe('64%');
    expect(formatCurvePct(null)).toBe('—');
    expect(formatCurvePct(140)).toBe('100%');
  });

  it('formats a creation date and time in the given timezone', () => {
    expect(formatDate('2026-11-14T03:15:03.912Z', 'UTC')).toBe('Nov 14, 2026');
    expect(formatTime('2026-11-14T03:15:03.912Z', 'UTC')).toBe('03:15');
    expect(formatDate('2026-11-14T03:15:03.912Z', 'America/Bogota')).toBe('Nov 13, 2026');
    expect(formatTime('2026-11-14T03:15:03.912Z', 'America/Bogota')).toBe('22:15');
    expect(formatDate('nope')).toBe('—');
    expect(formatTime('nope')).toBe('—');
  });
});
