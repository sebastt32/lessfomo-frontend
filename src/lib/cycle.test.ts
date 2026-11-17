import { describe, expect, it } from 'vitest';
import type { TokenCycle } from '../api/types';
import { makeCycle as fixtureCycle, makeStableCycle as fixtureStableCycle, T0 } from '../test/fixtures';
import {
  cycleFacts,
  cycleMarks,
  formatDurationCompact,
  investWindowCompact,
  investWindowRange,
  investWindowSentence,
  newerCycle,
  placeCycle,
} from './cycle';

const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
/** 12 minutes after the fixture cycle appeared (T0 + 120). */
const NOW = (T0 + 120 + 720) * 1000;
const CREATED = iso(T0);

/** The fixture cycles moved onto the candle fixtures' clock: appeared at T0 + 2 min, crashed at T0 + 15 min. */
const makeCycle = (overrides: Partial<TokenCycle> = {}) =>
  fixtureCycle({
    appearedAt: iso(T0 + 120),
    runStartAt: iso(T0 + 500),
    explosionAt: iso(T0 + 540),
    peakAt: iso(T0 + 720),
    crashAt: iso(T0 + 900),
    updatedAt: iso(T0 + 900),
    ...overrides,
  });
const makeStableCycle = (overrides: Partial<TokenCycle> = {}) =>
  fixtureStableCycle({ appearedAt: iso(T0 + 120), updatedAt: iso(T0 + 120), ...overrides });

describe('invest window sentences', () => {
  it('says how long the token could be bought before the run-up', () => {
    expect(investWindowSentence(makeCycle(), NOW)).toBe('Could be bought for 6 min 20 s before the run-up');
    expect(investWindowCompact(makeCycle(), NOW)).toBe('6m 20s window');
  });

  it('counts up while the token is still stable', () => {
    expect(investWindowSentence(makeStableCycle(), NOW)).toBe('Still stable: 12 min since it appeared');
    expect(investWindowSentence(makeStableCycle(), NOW + 5_000)).toBe('Still stable: 12 min 5 s since it appeared');
    expect(investWindowCompact(makeStableCycle(), NOW)).toBe('12m so far');
  });

  it('explains a negative window: the token appeared after it had already exploded', () => {
    const late = makeCycle({ appearedLate: true, investWindowSeconds: -180 });
    expect(investWindowSentence(late, NOW)).toBe('Appeared 3 min after it had already exploded');
    expect(investWindowCompact(late, NOW)).toBe('3m late');
    // A late token that has not reached 2× its base price is still late, not "stable and buyable".
    const lateStable = makeStableCycle({ appearedLate: true, investWindowSeconds: -45 });
    expect(investWindowSentence(lateStable, NOW)).toBe('Appeared 45 s after it had already exploded');
  });

  it('handles a run-up that started the moment it appeared, and unknown windows', () => {
    expect(investWindowSentence(makeCycle({ investWindowSeconds: 0 }), NOW)).toBe(
      'The run-up started as it appeared: there was no time to buy before it',
    );
    expect(investWindowSentence(makeCycle({ investWindowSeconds: null }), NOW)).toBe('Invest window not known');
    expect(investWindowSentence(makeCycle({ appearedLate: true, investWindowSeconds: null }), NOW)).toBe(
      'Appeared after it had already exploded',
    );
    expect(investWindowCompact(makeCycle({ investWindowSeconds: null }), NOW)).toBe('—');
    expect(investWindowCompact(null, NOW)).toBe('—');
    expect(investWindowCompact(undefined, NOW)).toBe('—');
  });

  it('formats compact durations', () => {
    expect(formatDurationCompact(45)).toBe('45s');
    expect(formatDurationCompact(380)).toBe('6m 20s');
    expect(formatDurationCompact(720)).toBe('12m');
    expect(formatDurationCompact(3_900)).toBe('1h 5m');
    expect(formatDurationCompact(90_000)).toBe('1d 1h');
  });
});

describe('cycleFacts', () => {
  it('describes the rise before appearing, peak, time to peak, drawdown and last price', () => {
    const facts = Object.fromEntries(cycleFacts(makeCycle()).map((fact) => [fact.key, fact.value]));
    expect(facts).toEqual({
      riseBefore: '1.50× its launch price',
      peak: '3.20× the base price',
      timeToPeak: '10 min after it appeared',
      drawdown: '62% below the peak',
      lastPrice: '1.40× the base price (+40.0%)',
    });
  });

  it('shows dashes for what is not known yet', () => {
    const facts = cycleFacts(
      makeStableCycle({ riseBeforeAppearanceX: null, lastPriceX: null, launchPriceSol: null }),
    );
    expect(facts.map((fact) => fact.value)).toEqual(['—', '—', '—', '—', '—']);
  });
});

describe('newerCycle', () => {
  it('keeps the cycle updated last and ignores missing ones', () => {
    const older = makeStableCycle();
    const newer = makeCycle();
    expect(newerCycle(older, newer)).toBe(newer);
    expect(newerCycle(newer, older)).toBe(newer);
    expect(newerCycle(null, older)).toBe(older);
    expect(newerCycle(older, undefined)).toBe(older);
    expect(newerCycle(null, undefined)).toBeNull();
  });
});

describe('cycleMarks', () => {
  it('lists every known moment of the cycle in time order', () => {
    expect(cycleMarks(CREATED, makeCycle()).map((mark) => [mark.kind, mark.label, mark.time])).toEqual([
      ['created', 'Created', T0],
      ['appeared', 'Appeared in lessfomo', T0 + 120],
      ['runStart', 'Run-up starts', T0 + 500],
      ['explosion', 'Explosion', T0 + 540],
      ['peak', 'Peak', T0 + 720],
      ['crash', 'Crash', T0 + 900],
    ]);
  });

  it('never draws the creation after the appearance when their clocks disagree by a second or two', () => {
    // detectedAt is our wall clock; appearedAt is the block time of a trade, which can be slightly earlier.
    const appearedAt = new Date((T0 + 120) * 1000).toISOString();
    const createdLate = new Date((T0 + 121) * 1000 + 500).toISOString();

    const marks = cycleMarks(createdLate, makeCycle({ appearedAt }));

    expect(marks.slice(0, 2).map((mark) => [mark.kind, mark.time])).toEqual([
      ['created', T0 + 120],
      ['appeared', T0 + 120],
    ]);
    expect(marks[0]?.at).toBe(createdLate);
  });

  it('leaves out moments that have not happened, and works without a cycle', () => {
    expect(cycleMarks(CREATED, makeStableCycle()).map((mark) => mark.kind)).toEqual(['created', 'appeared']);
    expect(cycleMarks(CREATED, null).map((mark) => mark.kind)).toEqual(['created']);
    expect(cycleMarks('not a date', null)).toEqual([]);
  });
});

describe('investWindowRange', () => {
  it('goes from the appearance to the start of the run-up', () => {
    expect(investWindowRange(makeCycle(), NOW)).toEqual({ from: T0 + 120, to: T0 + 500, open: false });
  });

  it('stays open up to now while the token is stable', () => {
    expect(investWindowRange(makeStableCycle(), NOW)).toEqual({ from: T0 + 120, to: T0 + 840, open: true });
  });

  it('is absent for late tokens and without a cycle', () => {
    expect(investWindowRange(makeCycle({ appearedLate: true, investWindowSeconds: -180 }), NOW)).toBeNull();
    expect(investWindowRange(makeStableCycle({ appearedLate: true }), NOW)).toBeNull();
    expect(investWindowRange(null, NOW)).toBeNull();
  });
});

describe('placeCycle', () => {
  const minutes = (...offsets: number[]) => offsets.map((m) => T0 + m * 60);

  it('puts each mark on the candle of its bucket and shades the window between its candles', () => {
    const candles = minutes(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
    const placed = placeCycle(cycleMarks(CREATED, makeCycle()), investWindowRange(makeCycle(), NOW), candles, '1m');
    expect(placed.marks.map((mark) => [mark.kind, mark.candleTime])).toEqual([
      ['created', T0],
      ['appeared', T0 + 120],
      ['runStart', T0 + 480],
      ['explosion', T0 + 540],
      ['peak', T0 + 720],
      ['crash', T0 + 900],
    ]);
    expect(placed.shade).toEqual({ from: T0 + 120, to: T0 + 480 });
  });

  it('snaps a mark in a bucket without trades to the next candle', () => {
    // No candle at minute 2 (no trades): the appearance lands on minute 3.
    const placed = placeCycle(cycleMarks(CREATED, makeStableCycle()), null, minutes(0, 1, 3, 4), '1m');
    expect(placed.marks.map((mark) => mark.candleTime)).toEqual([T0, T0 + 180]);
  });

  it('keeps marks outside the loaded candles off the chart without failing', () => {
    // Only minutes 9-13 are loaded: creation, appearance and run-up are older; the crash is newer.
    const placed = placeCycle(
      cycleMarks(CREATED, makeCycle()),
      investWindowRange(makeCycle(), NOW),
      minutes(9, 10, 11, 12, 13),
      '1m',
    );
    expect(placed.marks.map((mark) => [mark.kind, mark.candleTime])).toEqual([
      ['created', null],
      ['appeared', null],
      ['runStart', null],
      ['explosion', T0 + 540],
      ['peak', T0 + 720],
      ['crash', null],
    ]);
    // The whole window is older than the first loaded candle.
    expect(placed.shade).toBeNull();
  });

  it('clips a window that is only partly loaded, and shades up to the last candle while stable', () => {
    const partly = placeCycle([], investWindowRange(makeCycle(), NOW), minutes(5, 6, 7, 8, 9), '1m');
    expect(partly.shade).toEqual({ from: T0 + 300, to: T0 + 480 });
    const stable = placeCycle([], investWindowRange(makeStableCycle(), NOW), minutes(0, 1, 2, 3, 4), '1m');
    expect(stable.shade).toEqual({ from: T0 + 120, to: T0 + 240 });
  });

  it('places nothing without candles', () => {
    const placed = placeCycle(cycleMarks(CREATED, makeCycle()), investWindowRange(makeCycle(), NOW), [], '1m');
    expect(placed.marks.every((mark) => mark.candleTime === null)).toBe(true);
    expect(placed.shade).toBeNull();
  });

  it('uses the bucket of the selected interval', () => {
    const placed = placeCycle(cycleMarks(CREATED, makeCycle()), null, [T0, T0 + 900], '15m');
    expect(placed.marks.map((mark) => mark.candleTime)).toEqual([T0, T0, T0, T0, T0, T0 + 900]);
  });
});
