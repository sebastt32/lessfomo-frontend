import { describe, expect, it } from 'vitest';
import { describeWalletRecord, formatEntrySeconds, formatSignedSol } from './smartWallets';
import { makeWalletRecord } from '../test/fixtures';

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
      'Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, suele comprar 4 s después del lanzamiento',
    );
  });

  it('omits the entry time when unknown and handles singular and losses', () => {
    expect(
      describeWalletRecord(makeWalletRecord({ tokens: 1, wins: 1, winRate: 100, netPnlSol: -0.5, medianEntrySeconds: null })),
    ).toBe('Ganó en 1 de 1 token (100%) en los últimos 7 días, resultado neto −0.50 SOL');
  });

  it('adds how long the wallet usually holds and how often it flips', () => {
    expect(describeWalletRecord(makeWalletRecord({ medianHoldSeconds: 840, flipRate: 12.4 }))).toBe(
      'Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, suele comprar 4 s después del lanzamiento, suele mantener 14 min; vendió antes de 2 min en el 12% de sus tokens',
    );
    expect(describeWalletRecord(makeWalletRecord({ medianEntrySeconds: null, medianHoldSeconds: null, flipRate: 0 }))).toBe(
      'Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, vendió antes de 2 min en el 0% de sus tokens',
    );
    expect(describeWalletRecord(makeWalletRecord({ medianHoldSeconds: 95, flipRate: null }))).toBe(
      'Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, suele comprar 4 s después del lanzamiento, suele mantener 1 min 35 s',
    );
  });

  it('keeps the sentence unchanged when the backend does not report holding behavior', () => {
    const { medianHoldSeconds: _hold, flipRate: _flip, style: _style, ...legacy } = makeWalletRecord({
      medianHoldSeconds: 60,
      flipRate: 10,
    });
    expect(describeWalletRecord(legacy)).toBe(
      'Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, suele comprar 4 s después del lanzamiento',
    );
  });

  it('says when there is no closed token yet', () => {
    expect(describeWalletRecord(makeWalletRecord({ tokens: 0, wins: 0, winRate: 0, netPnlSol: 0 }))).toBe(
      'Todavía no cerró ningún token en los últimos 7 días',
    );
  });
});
