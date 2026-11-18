import { describe, expect, it } from 'vitest';
import type { CyclesAnalysisResponse, TokenCycle } from '../api/types';
import {
  dayBounds,
  dayKey,
  describeRecordDay,
  describeRecordMonth,
  monthBounds,
  parseRecordDay,
  recordOutcome,
  recordQuery,
  shiftDay,
  successSummary,
  withRecordDay,
} from './dailyRecord';
import { parseAppLocation, serializeAppLocation } from './appLocation';

const NOW = new Date(2026, 10, 17, 15, 30);

describe('the selected day in the URL', () => {
  it('is today unless a real past or current day is given', () => {
    expect(dayKey(NOW)).toBe('2026-11-17');
    expect(parseRecordDay('?view=record', NOW)).toBe('2026-11-17');
    expect(parseRecordDay('?view=record&day=2026-11-03', NOW)).toBe('2026-11-03');
    for (const bad of ['2026-11-18', '2027-01-01', '2026-02-30', '17-11-2026', 'today', '']) {
      expect(parseRecordDay(`?view=record&day=${bad}`, NOW)).toBe('2026-11-17');
    }
  });

  it('omits today and keeps every other parameter', () => {
    expect(withRecordDay('?view=record', '2026-11-16', NOW)).toBe('?view=record&day=2026-11-16');
    expect(withRecordDay('?view=record&day=2026-11-16', '2026-11-17', NOW)).toBe('?view=record');
    expect(withRecordDay('?view=record&minConvictionWallets=5&day=2026-11-01', '2026-11-02', NOW)).toBe(
      '?view=record&minConvictionWallets=5&day=2026-11-02',
    );
  });

  it('moves across months and years', () => {
    expect(shiftDay('2026-11-17', -1)).toBe('2026-11-16');
    expect(shiftDay('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('is a view of its own that serializes without history filters', () => {
    expect(parseAppLocation('?view=record&day=2026-11-03').view).toBe('record');
    expect(serializeAppLocation({ view: 'record' })).toBe('?view=record');
  });
});

describe('API bounds', () => {
  it('covers the local day and the local month of the selected day', () => {
    expect(dayBounds('2026-11-17')).toEqual({
      from: new Date(2026, 10, 17).toISOString(),
      to: new Date(2026, 10, 18).toISOString(),
    });
    expect(monthBounds('2026-11-17')).toEqual({
      from: new Date(2026, 10, 1).toISOString(),
      to: new Date(2026, 11, 1).toISOString(),
    });
    expect(monthBounds('2026-12-05').to).toBe(new Date(2027, 0, 1).toISOString());
  });

  it('lists the tokens that appeared that day, newest first', () => {
    expect(recordQuery('2026-11-17', 2)).toEqual({
      ...dayBounds('2026-11-17'),
      dateField: 'appearedAt',
      sort: { field: 'appearedAt', direction: 'desc' },
      page: 2,
      pageSize: 200,
    });
  });
});

const cycle = (overrides: Partial<TokenCycle>): TokenCycle => ({
  appearedAt: '2026-11-17T10:00:00.000Z',
  launchPriceSol: 1,
  appearedPriceSol: 1,
  riseBeforeAppearanceX: 1,
  appearedLate: false,
  phase: 'stable',
  runStartAt: null,
  explosionAt: null,
  investWindowSeconds: null,
  peakAt: null,
  peakX: null,
  crashAt: null,
  maxDrawdownPct: null,
  lastPriceX: 1,
  updatedAt: '2026-11-17T10:00:00.000Z',
  ...overrides,
});

describe('recordOutcome', () => {
  const appeared = Date.parse('2026-11-17T10:00:00.000Z');

  it('is a hit once the token reached 2× its appearance price, crashed or not', () => {
    expect(recordOutcome(cycle({ phase: 'exploding' }), appeared + 60_000)).toBe('hit');
    expect(recordOutcome(cycle({ phase: 'crashed' }), appeared + 48 * 3_600_000)).toBe('hit');
  });

  it('is still tracking for 24 hours after appearing, then missed', () => {
    expect(recordOutcome(cycle({}), appeared + 23 * 3_600_000)).toBe('tracking');
    expect(recordOutcome(cycle({}), appeared + 24 * 3_600_000)).toBe('missed');
  });

  it('is unknown without a cycle', () => {
    expect(recordOutcome(null, appeared)).toBe('unknown');
    expect(recordOutcome(undefined, appeared)).toBe('unknown');
  });
});

const analysis = (tokens: number, explodedPct: number | null): CyclesAnalysisResponse => ({
  from: '',
  to: '',
  tokens,
  appearedInTimePct: null,
  appearedLatePct: null,
  explodedPct,
  neverExplodedPct: null,
  crashedPct: null,
  medianInvestWindowSeconds: null,
  medianPeakX: null,
  medianSecondsToPeak: null,
  medianSecondsPeakToCrash: null,
  windowBuckets: [],
});

describe('successSummary', () => {
  it('counts the tokens that reached 2× from the share', () => {
    expect(successSummary(analysis(129, 22.48))).toEqual({ tokens: 129, hits: 29, pct: 22.48 });
  });

  it('has no share without tokens', () => {
    expect(successSummary(analysis(0, null))).toEqual({ tokens: 0, hits: 0, pct: null });
  });
});

describe('labels', () => {
  it('names the day and its month', () => {
    expect(describeRecordDay('2026-11-17')).toBe('17 de noviembre de 2026');
    expect(describeRecordMonth('2026-11-17')).toBe('noviembre de 2026');
  });
});
