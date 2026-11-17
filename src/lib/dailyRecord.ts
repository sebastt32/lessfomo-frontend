import type { TokenListQuery } from '../api/client';
import type { CyclesAnalysisResponse, TokenCycle } from '../api/types';
import { describeDateFilter, parseDay, type DateBounds } from './dateRange';

/**
 * The daily record: the tokens that appeared in lessfomo on one local calendar day, and the share of them
 * that reached 2× their appearance price afterwards. The day lives in the URL (`?view=record&day=YYYY-MM-DD`),
 * omitted for today.
 */

export const RECORD_DAY_PARAM = 'day';

/** A token that has not reached 2× is still being tracked for this long after appearing. */
export const TRACKING_MS = 24 * 3_600_000;

/** Tokens per request; a day rarely has more, and the list loads every page. */
export const RECORD_PAGE_SIZE = 200;

const pad = (value: number) => String(value).padStart(2, '0');

/** The local calendar day of a date, as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The day in the URL when it is a real day no later than today; today otherwise. */
export function parseRecordDay(search: string, now: Date): string {
  const today = dayKey(now);
  const requested = new URLSearchParams(search).get(RECORD_DAY_PARAM) ?? '';
  return parseDay(requested) !== null && requested <= today ? requested : today;
}

/** The search with `day` set to the given day, or removed for today; other parameters are kept. */
export function withRecordDay(search: string, day: string, now: Date): string {
  const params = new URLSearchParams(search);
  if (day === dayKey(now)) params.delete(RECORD_DAY_PARAM);
  else params.set(RECORD_DAY_PARAM, day);
  const serialized = params.toString();
  return serialized === '' ? '' : `?${serialized}`;
}

function localDate(day: string, offsetDays = 0): Date {
  const { year, month, day: date } = parseDay(day)!;
  return new Date(year, month - 1, date + offsetDays);
}

/** The day `days` calendar days away (negative: earlier). */
export function shiftDay(day: string, days: number): string {
  return dayKey(localDate(day, days));
}

/** API bounds of the local day: midnight (inclusive) to the next midnight (exclusive). */
export function dayBounds(day: string): Required<DateBounds> {
  return { from: localDate(day).toISOString(), to: localDate(day, 1).toISOString() };
}

/** API bounds of the local month that holds the day. */
export function monthBounds(day: string): Required<DateBounds> {
  const { year, month } = parseDay(day)!;
  return { from: new Date(year, month - 1, 1).toISOString(), to: new Date(year, month, 1).toISOString() };
}

/** GET /api/tokens query for one page of the tokens that appeared on the day, newest first. */
export function recordQuery(day: string, page: number): TokenListQuery {
  return {
    ...dayBounds(day),
    dateField: 'appearedAt',
    sort: { field: 'appearedAt', direction: 'desc' },
    page,
    pageSize: RECORD_PAGE_SIZE,
  };
}

/**
 * What happened to a token after it appeared: `hit` once it reached 2× its appearance price (even if it
 * crashed later); `tracking` while it has not and appeared less than 24 hours ago; `missed` after that.
 */
export type RecordOutcome = 'hit' | 'tracking' | 'missed' | 'unknown';

export function recordOutcome(cycle: TokenCycle | null | undefined, now: number): RecordOutcome {
  if (cycle === null || cycle === undefined) return 'unknown';
  if (cycle.phase !== 'stable') return 'hit';
  return now - Date.parse(cycle.appearedAt) < TRACKING_MS ? 'tracking' : 'missed';
}

export const OUTCOME_LABELS: Record<RecordOutcome, string> = {
  hit: 'Reached 2×',
  tracking: 'Tracking',
  missed: 'No 2×',
  unknown: 'No data',
};

export const OUTCOME_HINTS: Record<RecordOutcome, string> = {
  hit: 'Its price reached at least twice the price it had when it appeared in lessfomo',
  tracking: 'Appeared less than 24 hours ago and has not reached 2× yet; it still can',
  missed: 'Did not reach 2× its appearance price in the 24 hours after appearing',
  unknown: 'The screener has not reported this token’s cycle yet',
};

export interface SuccessSummary {
  tokens: number;
  /** Tokens that reached 2× after appearing. */
  hits: number;
  /** 0-100; null without tokens. */
  pct: number | null;
}

/** The success of a range from GET /api/analysis/cycles: tokens that appeared, and the share that reached 2×. */
export function successSummary(analysis: CyclesAnalysisResponse): SuccessSummary {
  const pct = analysis.tokens === 0 ? null : analysis.explodedPct;
  return { tokens: analysis.tokens, hits: pct === null ? 0 : Math.round((pct * analysis.tokens) / 100), pct };
}

/** "November 17, 2026". */
export function describeRecordDay(day: string): string {
  const { year, month, day: date } = parseDay(day)!;
  return describeDateFilter({ kind: 'period', year, month, day: date });
}

/** "November 2026". */
export function describeRecordMonth(day: string): string {
  const { year, month } = parseDay(day)!;
  return describeDateFilter({ kind: 'period', year, month, day: null });
}
