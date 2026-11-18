import { describe, expect, it } from 'vitest';
import { formatUsdCompact, marketCapSol, PUMP_TOTAL_SUPPLY, solToUsd } from './money';

describe('formatUsdCompact', () => {
  it('writes dollars short: whole dollars, then thousands and millions', () => {
    expect(formatUsdCompact(0)).toBe('$0');
    expect(formatUsdCompact(850.4)).toBe('$850');
    expect(formatUsdCompact(4_520)).toBe('$4.52K');
    expect(formatUsdCompact(45_230)).toBe('$45.2K');
    expect(formatUsdCompact(452_300)).toBe('$452K');
    expect(formatUsdCompact(1_254_000)).toBe('$1.25M');
    expect(formatUsdCompact(12_540_000)).toBe('$12.5M');
    expect(formatUsdCompact(2_100_000_000)).toBe('$2.1B');
    expect(formatUsdCompact(0.42)).toBe('$0.42');
  });

  it('shows a dash when unknown', () => {
    expect(formatUsdCompact(null)).toBe('—');
    expect(formatUsdCompact(Number.NaN)).toBe('—');
  });
});

describe('conversions', () => {
  it('turns a pump.fun price into a market cap with the fixed supply of one billion', () => {
    expect(PUMP_TOTAL_SUPPLY).toBe(1_000_000_000);
    expect(marketCapSol(0.00000003)).toBeCloseTo(30);
    expect(marketCapSol(null)).toBeNull();
  });

  it('converts SOL to USD only when both are known', () => {
    expect(solToUsd(30, 150)).toBe(4500);
    expect(solToUsd(30, null)).toBeNull();
    expect(solToUsd(null, 150)).toBeNull();
  });
});
