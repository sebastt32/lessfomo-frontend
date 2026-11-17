import { describe, expect, it } from 'vitest';
import { analysisGrouping, analysisRows, describeWalletRecord, formatEntrySeconds, formatSignedSol } from './smartWallets';
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

  it('adds how long the wallet usually holds and how often it flips', () => {
    expect(describeWalletRecord(makeWalletRecord({ medianHoldSeconds: 840, flipRate: 12.4 }))).toBe(
      'Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, usually buys 4 s after launch, usually holds 14 min; sold within 2 min in 12% of its tokens',
    );
    expect(describeWalletRecord(makeWalletRecord({ medianEntrySeconds: null, medianHoldSeconds: null, flipRate: 0 }))).toBe(
      'Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, sold within 2 min in 0% of its tokens',
    );
    expect(describeWalletRecord(makeWalletRecord({ medianHoldSeconds: 95, flipRate: null }))).toBe(
      'Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, usually buys 4 s after launch, usually holds 1 min 35 s',
    );
  });

  it('keeps the sentence unchanged when the backend does not report holding behavior', () => {
    const { medianHoldSeconds: _hold, flipRate: _flip, style: _style, ...legacy } = makeWalletRecord({
      medianHoldSeconds: 60,
      flipRate: 10,
    });
    expect(describeWalletRecord(legacy)).toBe(
      'Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, usually buys 4 s after launch',
    );
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

  it('reads conviction buckets keyed by convictionWallets and orders numerically, 10+ last', () => {
    const base = makeAnalysis().buckets[0]!;
    const conviction = (key: string, reached2xPct: number) => {
      const { smartWallets: _omit, ...rest } = base;
      return { ...rest, convictionWallets: key, reached2xPct };
    };
    const rows = analysisRows([conviction('10+', 40), conviction('3', 20), conviction('0', 5), conviction('1', 10)]);
    expect(rows.map((r) => r.key)).toEqual(['0', '1', '3', '10+']);
    expect(rows.map((r) => r.label)).toEqual(['None', '1 wallet', '3 wallets', '10+ wallets']);
    expect(rows[3]?.lift).toBe('8.0× vs none');
  });

  it('tells which grouping the backend actually answered with', () => {
    expect(analysisGrouping(makeAnalysis())).toBe('smartWallets');
    expect(analysisGrouping(makeAnalysis({ by: 'conviction' }))).toBe('conviction');
    const { smartWallets: _key, ...base } = makeAnalysis().buckets[0]!;
    expect(analysisGrouping(makeAnalysis({ buckets: [{ ...base, convictionWallets: '3' }] }))).toBe('conviction');
  });

  it('has no lift when the baseline is missing or zero', () => {
    const rows = analysisRows(makeAnalysis().buckets.filter((b) => b.smartWallets !== '0'));
    expect(rows[0]?.lift).toBeNull();
  });
});
