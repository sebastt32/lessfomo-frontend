/**
 * Date filters for the token history list. A filter is stored in the URL as one `range` value and turned into
 * the API's `from` (inclusive) / `to` (exclusive) ISO instants using the viewer's local day boundaries.
 */

export type DatePreset = 'today' | '7d' | 'this-month' | 'this-year';

export type DateFilter =
  | { kind: 'all' }
  | { kind: 'preset'; preset: DatePreset }
  /** A picked year, optionally narrowed to a month (1-12) and then a day. */
  | { kind: 'period'; year: number; month: number | null; day: number | null }
  /** Custom range of calendar days (YYYY-MM-DD); both ends inclusive, either may be open. */
  | { kind: 'range'; from: string | null; to: string | null };

export interface DateBounds {
  from?: string;
  to?: string;
}

export const ALL_TIME: DateFilter = { kind: 'all' };

const PRESETS: readonly DatePreset[] = ['today', '7d', 'this-month', 'this-year'];

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  'this-month': 'This month',
  'this-year': 'This year',
};

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isValidDay(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Parses YYYY-MM-DD into its parts, or null when it is not a real calendar day. */
export function parseDay(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return isValidDay(year, month, day) ? { year, month, day } : null;
}

function parseRange(value: string): DateFilter | null {
  const separator = value.indexOf('..');
  if (separator === -1) return null;
  const from = value.slice(0, separator);
  const to = value.slice(separator + 2);
  if (from === '' && to === '') return null;
  if ((from !== '' && !parseDay(from)) || (to !== '' && !parseDay(to))) return null;
  if (from !== '' && to !== '' && from > to) return null;
  return { kind: 'range', from: from || null, to: to || null };
}

function parsePeriod(value: string): DateFilter | null {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = match[2] === undefined ? null : Number(match[2]);
  const day = match[3] === undefined ? null : Number(match[3]);
  if (month !== null && (month < 1 || month > 12)) return null;
  if (month !== null && day !== null && !isValidDay(year, month, day)) return null;
  return { kind: 'period', year, month, day };
}

/** Reads the URL `range` value; anything unrecognised means all time. */
export function parseDateFilter(value: string | null): DateFilter {
  if (value === null || value === '') return ALL_TIME;
  if ((PRESETS as readonly string[]).includes(value)) return { kind: 'preset', preset: value as DatePreset };
  return parseRange(value) ?? parsePeriod(value) ?? ALL_TIME;
}

/** The URL `range` value for a filter, or null for all time. */
export function serializeDateFilter(filter: DateFilter): string | null {
  switch (filter.kind) {
    case 'all':
      return null;
    case 'preset':
      return filter.preset;
    case 'period': {
      let value = String(filter.year);
      if (filter.month !== null) value += `-${pad(filter.month)}`;
      if (filter.month !== null && filter.day !== null) value += `-${pad(filter.day)}`;
      return value;
    }
    case 'range':
      return `${filter.from ?? ''}..${filter.to ?? ''}`;
  }
}

function localMidnight(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString();
}

function dayStart(value: string, offsetDays = 0): string {
  const { year, month, day } = parseDay(value)!;
  return localMidnight(year, month - 1, day + offsetDays);
}

/** API bounds for a filter: `from` inclusive and `to` exclusive, at local midnight, as ISO instants. */
export function dateFilterBounds(filter: DateFilter, now: Date): DateBounds {
  const [year, monthIndex, day] = [now.getFullYear(), now.getMonth(), now.getDate()];
  switch (filter.kind) {
    case 'all':
      return {};
    case 'preset':
      switch (filter.preset) {
        case 'today':
          return { from: localMidnight(year, monthIndex, day), to: localMidnight(year, monthIndex, day + 1) };
        case '7d':
          return { from: localMidnight(year, monthIndex, day - 6), to: localMidnight(year, monthIndex, day + 1) };
        case 'this-month':
          return { from: localMidnight(year, monthIndex, 1), to: localMidnight(year, monthIndex + 1, 1) };
        case 'this-year':
          return { from: localMidnight(year, 0, 1), to: localMidnight(year + 1, 0, 1) };
      }
    case 'period': {
      if (filter.month === null) {
        return { from: localMidnight(filter.year, 0, 1), to: localMidnight(filter.year + 1, 0, 1) };
      }
      if (filter.day === null) {
        return {
          from: localMidnight(filter.year, filter.month - 1, 1),
          to: localMidnight(filter.year, filter.month, 1),
        };
      }
      return {
        from: localMidnight(filter.year, filter.month - 1, filter.day),
        to: localMidnight(filter.year, filter.month - 1, filter.day + 1),
      };
    }
    case 'range': {
      const bounds: DateBounds = {};
      if (filter.from) bounds.from = dayStart(filter.from);
      if (filter.to) bounds.to = dayStart(filter.to, 1);
      return bounds;
    }
  }
}

// Calendar labels do not depend on the viewer's timezone: format the parts as a UTC date.
const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const longDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shortDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

function formatShortDay(value: string): string {
  const { year, month, day } = parseDay(value)!;
  return shortDay.format(Date.UTC(year, month - 1, day));
}

/** Name of a month (1-12), e.g. "February". */
export function describeMonth(month: number): string {
  return monthName.format(Date.UTC(2000, month - 1, 1));
}

/** Human label for a filter, e.g. "Last 7 days", "February 2025" or "Nov 1, 2026 to Nov 10, 2026". */
export function describeDateFilter(filter: DateFilter): string {
  switch (filter.kind) {
    case 'all':
      return 'All time';
    case 'preset':
      return PRESET_LABELS[filter.preset];
    case 'period':
      if (filter.month === null) return String(filter.year);
      if (filter.day === null) return monthYear.format(Date.UTC(filter.year, filter.month - 1, 1));
      return longDay.format(Date.UTC(filter.year, filter.month - 1, filter.day));
    case 'range':
      if (filter.from && filter.to) return `${formatShortDay(filter.from)} to ${formatShortDay(filter.to)}`;
      if (filter.from) return `Since ${formatShortDay(filter.from)}`;
      return `Until ${formatShortDay(filter.to!)}`;
  }
}

export const DATE_PRESETS = PRESETS;
export const DATE_PRESET_LABELS = PRESET_LABELS;
