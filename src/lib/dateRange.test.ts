import { describe, expect, it } from 'vitest';
import { dateFilterBounds, describeDateFilter, parseDateFilter, serializeDateFilter, type DateFilter } from './dateRange';

// Expectations are built from local dates so the tests hold in any timezone.
const local = (year: number, month: number, day: number) => new Date(year, month - 1, day).toISOString();
const NOW = new Date(2026, 10, 14, 15, 30); // 14 Nov 2026, 15:30 local

describe('parseDateFilter / serializeDateFilter', () => {
  it.each<[string | null, DateFilter]>([
    [null, { kind: 'all' }],
    ['', { kind: 'all' }],
    ['today', { kind: 'preset', preset: 'today' }],
    ['7d', { kind: 'preset', preset: '7d' }],
    ['this-month', { kind: 'preset', preset: 'this-month' }],
    ['this-year', { kind: 'preset', preset: 'this-year' }],
    ['2026', { kind: 'period', year: 2026, month: null, day: null }],
    ['2026-11', { kind: 'period', year: 2026, month: 11, day: null }],
    ['2026-11-04', { kind: 'period', year: 2026, month: 11, day: 4 }],
    ['2026-11-01..2026-11-10', { kind: 'range', from: '2026-11-01', to: '2026-11-10' }],
    ['2026-11-01..', { kind: 'range', from: '2026-11-01', to: null }],
    ['..2026-11-10', { kind: 'range', from: null, to: '2026-11-10' }],
  ])('%s parses and round-trips', (value, filter) => {
    expect(parseDateFilter(value)).toEqual(filter);
    expect(serializeDateFilter(filter)).toBe(value === '' ? null : value);
  });

  it.each(['yesterday', '2026-13', '2026-02-30', '20266', '..', '2026-11-10..2026-11-01', 'abc..2026-11-01'])(
    'treats an invalid value (%s) as all time',
    (value) => {
      expect(parseDateFilter(value)).toEqual({ kind: 'all' });
    },
  );
});

describe('dateFilterBounds', () => {
  it('has no bounds for all time', () => {
    expect(dateFilterBounds({ kind: 'all' }, NOW)).toEqual({});
  });

  it('computes presets from the injected local now', () => {
    expect(dateFilterBounds({ kind: 'preset', preset: 'today' }, NOW)).toEqual({
      from: local(2026, 11, 14),
      to: local(2026, 11, 15),
    });
    expect(dateFilterBounds({ kind: 'preset', preset: '7d' }, NOW)).toEqual({
      from: local(2026, 11, 8),
      to: local(2026, 11, 15),
    });
    expect(dateFilterBounds({ kind: 'preset', preset: 'this-month' }, NOW)).toEqual({
      from: local(2026, 11, 1),
      to: local(2026, 12, 1),
    });
    expect(dateFilterBounds({ kind: 'preset', preset: 'this-year' }, NOW)).toEqual({
      from: local(2026, 1, 1),
      to: local(2027, 1, 1),
    });
  });

  it('rolls over month and year ends', () => {
    const newYearsEve = new Date(2026, 11, 31, 23, 59);
    expect(dateFilterBounds({ kind: 'preset', preset: 'today' }, newYearsEve)).toEqual({
      from: local(2026, 12, 31),
      to: local(2027, 1, 1),
    });
    expect(dateFilterBounds({ kind: 'preset', preset: 'this-month' }, newYearsEve)).toEqual({
      from: local(2026, 12, 1),
      to: local(2027, 1, 1),
    });
  });

  it('computes a picked year, month or day as [start, next start)', () => {
    expect(dateFilterBounds({ kind: 'period', year: 2025, month: null, day: null }, NOW)).toEqual({
      from: local(2025, 1, 1),
      to: local(2026, 1, 1),
    });
    expect(dateFilterBounds({ kind: 'period', year: 2025, month: 2, day: null }, NOW)).toEqual({
      from: local(2025, 2, 1),
      to: local(2025, 3, 1),
    });
    expect(dateFilterBounds({ kind: 'period', year: 2025, month: 2, day: 28 }, NOW)).toEqual({
      from: local(2025, 2, 28),
      to: local(2025, 3, 1),
    });
  });

  it('makes the custom "to" day inclusive by ending at the next midnight', () => {
    expect(dateFilterBounds({ kind: 'range', from: '2026-11-01', to: '2026-11-10' }, NOW)).toEqual({
      from: local(2026, 11, 1),
      to: local(2026, 11, 11),
    });
    expect(dateFilterBounds({ kind: 'range', from: null, to: '2026-11-10' }, NOW)).toEqual({ to: local(2026, 11, 11) });
    expect(dateFilterBounds({ kind: 'range', from: '2026-11-01', to: null }, NOW)).toEqual({ from: local(2026, 11, 1) });
  });
});

describe('describeDateFilter', () => {
  it.each<[DateFilter, string]>([
    [{ kind: 'all' }, 'All time'],
    [{ kind: 'preset', preset: 'today' }, 'Today'],
    [{ kind: 'preset', preset: '7d' }, 'Last 7 days'],
    [{ kind: 'preset', preset: 'this-month' }, 'This month'],
    [{ kind: 'preset', preset: 'this-year' }, 'This year'],
    [{ kind: 'period', year: 2025, month: null, day: null }, '2025'],
    [{ kind: 'period', year: 2025, month: 2, day: null }, 'February 2025'],
    [{ kind: 'period', year: 2025, month: 2, day: 3 }, 'February 3, 2025'],
    [{ kind: 'range', from: '2026-11-01', to: '2026-11-10' }, 'Nov 1, 2026 to Nov 10, 2026'],
    [{ kind: 'range', from: '2026-11-01', to: null }, 'Since Nov 1, 2026'],
    [{ kind: 'range', from: null, to: '2026-11-10' }, 'Until Nov 10, 2026'],
  ])('%j -> %s', (filter, label) => {
    expect(describeDateFilter(filter)).toBe(label);
  });
});
