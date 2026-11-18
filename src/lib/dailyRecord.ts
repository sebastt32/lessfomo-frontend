import type { TokenListQuery } from '../api/client';
import type { CyclesAnalysisResponse, TokenCycle } from '../api/types';

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

export interface DayBounds {
  /** ISO instant, inclusive. */
  from: string;
  /** ISO instant, exclusive. */
  to: string;
}

/** Parses YYYY-MM-DD into its parts, or null when it is not a real calendar day. */
export function parseDay(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= new Date(year, month, 0).getDate();
  return valid ? { year, month, day } : null;
}

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
export function dayBounds(day: string): DayBounds {
  return { from: localDate(day).toISOString(), to: localDate(day, 1).toISOString() };
}

/** API bounds of the local month that holds the day. */
export function monthBounds(day: string): DayBounds {
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
  hit: 'Llegó a 2×',
  tracking: 'En seguimiento',
  missed: 'No llegó',
  unknown: 'Sin datos',
};

export const OUTCOME_HINTS: Record<RecordOutcome, string> = {
  hit: 'Su precio llegó al menos al doble del que tenía cuando apareció en lessfomo',
  tracking: 'Apareció hace menos de 24 horas y todavía no llegó a 2×; todavía puede',
  missed: 'Pasaron más de 24 horas y no llegó al doble de su precio al aparecer; si llega más tarde, cuenta como éxito',
  unknown: 'Todavía no hay datos del ciclo de este token',
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

// Calendar labels do not depend on the viewer's timezone: format the parts as a UTC date.
const longDay = new Intl.DateTimeFormat('es', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const monthYear = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "17 de noviembre de 2026". */
export function describeRecordDay(day: string): string {
  const { year, month, day: date } = parseDay(day)!;
  return longDay.format(Date.UTC(year, month - 1, date));
}

/** "noviembre de 2026". */
export function describeRecordMonth(day: string): string {
  const { year, month } = parseDay(day)!;
  return monthYear.format(Date.UTC(year, month - 1, 1));
}
