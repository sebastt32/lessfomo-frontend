import { describe, expect, it } from 'vitest';
import { analysisRows, describeWalletRecord, formatEntrySeconds, formatSignedSol } from './smartWallets';
import { makeAnalysis, makeWalletRecord } from '../test/fixtures';

describe('formatEntrySeconds', () => {
  it('reads as seconds, minutes or hours after launch', () => {
    expect(formatEntrySeconds(0)).toBe('0 s');
    expect(formatEntrySeconds(4.4)).toBe('4 s');
    expect(formatEntrySeconds(125)).toBe('2 min 5 s');
    expect(formatEntrySeconds(120)).toBe('2 min');
    expect(formatEntrySeconds(3_780)).toBe('1 h 3 min');
  });
});

describe('formatSignedSol', () => {
  it('always shows the sign', () => {
    expect(formatSignedSol(14.236)).toBe('+14.24 SOL');
    expect(formatSignedSol(-1.2)).toBe('−1.20 SOL');
    expect(formatSignedSol(0)).toBe('0.00 SOL');
  });
});

describe('describeWalletRecord', () => {
  it('explains the track record in plain language', () => {
    expect(describeWalletRecord(makeWalletRecord())).toBe(
      'Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, usually buys 4 s after launch',
    );
  });

  it('omits the entry time when unknown and handles singular and losses', () => {
    expect(
      describeWalletRecord(makeWalletRecord({ tokens: 1, wins: 1, winRate: 100, netPnlSol: -0.5, medianEntrySeconds: null })),
    ).toBe('Won 1 of 1 token (100%) in the last 7 days, net −0.50 SOL');
  });

  it('says when there is no closed token yet', () => {
    expect(describeWalletRecord(makeWalletRecord({ tokens: 0, wins: 0, winRate: 0, netPnlSol: 0 }))).toBe(
      'No closed tokens in the last 7 days yet',
    );
  });
});

describe('analysisRows', () => {
  it('orders buckets 0, 1, 2, 3, 4, 5+, formats them and compares each with tokens bought by none', () => {
    const rows = analysisRows(makeAnalysis().buckets);
    expect(rows.map((r) => r.label)).toEqual(['None', '1 wallet', '2 wallets', '5+ wallets']);
    expect(rows[1]).toMatchObject({
      key: '1',
      tokens: '400',
      reached2x: '6.2%',
      avgReturn: '−1.0%',
      medianReturn: '−3.5%',
      winners: '12.5%',
      lift: '2.0× vs none',
    });
    expect(rows[0]?.lift).toBe('Baseline');
    // Bar widths are relative to the best bucket.
    expect(rows.find((r) => r.key === '5+')?.barPct).toBe(100);
    expect(rows[0]?.barPct).toBeCloseTo(12.4);
  });

  it('has no lift when the baseline is missing or zero', () => {
    const rows = analysisRows(makeAnalysis().buckets.filter((b) => b.smartWallets !== '0'));
    expect(rows[0]?.lift).toBeNull();
  });
});
