import { useId, useState, type FormEvent } from 'react';
import type { CyclePhase, Lifecycle, SafetyStatus } from '../../api/types';
import { PHASE_LABELS } from '../../lib/cycle';
import {
  ALL_TIME,
  DATE_PRESET_LABELS,
  DATE_PRESETS,
  daysInMonth,
  describeMonth,
  serializeDateFilter,
  type DateFilter,
  type DatePreset,
} from '../../lib/dateRange';
import { hasActiveFilters, PHASE_ORDER, STATUS_ORDER, type HistoryFilters as Filters } from '../../lib/historyQuery';
import { SegmentedControl } from '../molecules/SegmentedControl';
import './HistoryFilters.css';

export interface HistoryFiltersProps {
  filters: Filters;
  /** Years offered by the year picker, newest first. */
  years: readonly number[];
  /** Receives the full next filters; the caller decides the page. */
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

const STATUS_LABELS: Record<SafetyStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  unverified: 'Unverified',
  pending: 'Pending',
};

const MIN_SCORES = [25, 50, 75, 90] as const;

type PresetValue = 'all' | DatePreset | 'other';
type LifecycleValue = 'all' | Lifecycle;
type AppearedValue = 'any' | 'in-time' | 'late';

/** `filters` with the phase filter set; an empty list removes it (every phase). */
function withPhase(filters: Filters, phase: CyclePhase[]): Filters {
  const { phase: _dropped, ...rest } = filters;
  return phase.length > 0 ? { ...rest, phase } : rest;
}

/** `filters` with the appeared-late filter set; null removes it (both). */
function withAppearedLate(filters: Filters, appearedLate: boolean | null): Filters {
  const { appearedLate: _dropped, ...rest } = filters;
  return appearedLate === null ? rest : { ...rest, appearedLate };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function SearchForm({ q, onSearch }: { q: string; onSearch: (q: string) => void }) {
  const [draft, setDraft] = useState(q);
  const id = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(draft.trim());
  }
  return (
    <form className="history-filters__search" role="search" onSubmit={submit}>
      <label htmlFor={id}>Search</label>
      <input
        id={id}
        type="search"
        value={draft}
        placeholder="Symbol, name or mint"
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}

function RangeForm({ date, onApply }: { date: DateFilter; onApply: (filter: DateFilter) => void }) {
  const [from, setFrom] = useState(date.kind === 'range' ? (date.from ?? '') : '');
  const [to, setTo] = useState(date.kind === 'range' ? (date.to ?? '') : '');
  const fromId = useId();
  const toId = useId();
  const errorId = useId();
  const invalid = from !== '' && to !== '' && from > to;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalid) return;
    onApply(from === '' && to === '' ? ALL_TIME : { kind: 'range', from: from || null, to: to || null });
  }

  return (
    <form className="history-filters__range" onSubmit={submit} aria-label="Custom date range">
      <div className="history-filters__field">
        <label htmlFor={fromId}>From</label>
        <input
          id={fromId}
          type="date"
          value={from}
          max={to || undefined}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => setFrom(event.target.value)}
        />
      </div>
      <div className="history-filters__field">
        <label htmlFor={toId}>To</label>
        <input
          id={toId}
          type="date"
          value={to}
          min={from || undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => setTo(event.target.value)}
        />
      </div>
      <button type="submit" className="button button--quiet" disabled={invalid}>
        Apply range
      </button>
      {invalid ? (
        <p id={errorId} className="history-filters__error" role="alert">
          The start date is after the end date.
        </p>
      ) : null}
    </form>
  );
}

/** Date, safety, lifecycle, score and text filters for the token history. Presentational. */
export function HistoryFilters({ filters, years, onChange, onReset }: HistoryFiltersProps) {
  const { date } = filters;
  const ids = { year: useId(), month: useId(), day: useId(), score: useId() };
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const setDate = (next: DateFilter) => set({ date: next });

  const presetValue: PresetValue = date.kind === 'all' ? 'all' : date.kind === 'preset' ? date.preset : 'other';
  const period = date.kind === 'period' ? date : null;
  const yearOptions = period && !years.includes(period.year) ? [period.year, ...years] : years;

  function toggleStatus(status: SafetyStatus, checked: boolean) {
    const next = checked ? [...filters.status, status] : filters.status.filter((s) => s !== status);
    set({ status: STATUS_ORDER.filter((s) => next.includes(s)) });
  }

  function togglePhase(phase: CyclePhase, checked: boolean) {
    const current = filters.phase ?? [];
    const next = checked ? [...current, phase] : current.filter((p) => p !== phase);
    onChange(withPhase(filters, PHASE_ORDER.filter((p) => next.includes(p))));
  }

  const appearedValue: AppearedValue =
    filters.appearedLate === undefined ? 'any' : filters.appearedLate ? 'late' : 'in-time';

  return (
    <div className="history-filters">
      <SearchForm key={filters.q} q={filters.q} onSearch={(q) => set({ q })} />

      <fieldset className="history-filters__group history-filters__group--date">
        <legend>Created</legend>
        <SegmentedControl<PresetValue>
          label="Date presets"
          value={presetValue}
          options={[
            { value: 'all', label: 'All time' },
            ...DATE_PRESETS.map((preset) => ({ value: preset, label: DATE_PRESET_LABELS[preset] })),
          ]}
          onChange={(value) => setDate(value === 'all' || value === 'other' ? ALL_TIME : { kind: 'preset', preset: value })}
        />

        <div className="history-filters__period" role="group" aria-label="Pick a year, month or day">
          <div className="history-filters__field">
            <label htmlFor={ids.year}>Year</label>
            <select
              id={ids.year}
              value={period ? String(period.year) : ''}
              onChange={(event) =>
                setDate(
                  event.target.value === ''
                    ? ALL_TIME
                    : { kind: 'period', year: Number(event.target.value), month: null, day: null },
                )
              }
            >
              <option value="">Any year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="history-filters__field">
            <label htmlFor={ids.month}>Month</label>
            <select
              id={ids.month}
              value={period?.month ?? ''}
              disabled={!period}
              onChange={(event) =>
                period &&
                setDate({
                  ...period,
                  month: event.target.value === '' ? null : Number(event.target.value),
                  day: null,
                })
              }
            >
              <option value="">Any month</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {describeMonth(month)}
                </option>
              ))}
            </select>
          </div>
          <div className="history-filters__field">
            <label htmlFor={ids.day}>Day</label>
            <select
              id={ids.day}
              value={period?.day ?? ''}
              disabled={!period || period.month === null}
              onChange={(event) =>
                period &&
                setDate({ ...period, day: event.target.value === '' ? null : Number(event.target.value) })
              }
            >
              <option value="">Any day</option>
              {period && period.month !== null
                ? Array.from({ length: daysInMonth(period.year, period.month) }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))
                : null}
            </select>
          </div>
        </div>

        <RangeForm key={serializeDateFilter(date) ?? 'all'} date={date} onApply={setDate} />
      </fieldset>

      <fieldset className="history-filters__group">
        <legend>Safety status</legend>
        <div className="history-filters__checks">
          {STATUS_ORDER.map((status) => (
            <label key={status} className="history-filters__check">
              <input
                type="checkbox"
                checked={filters.status.includes(status)}
                onChange={(event) => toggleStatus(status, event.target.checked)}
              />
              {STATUS_LABELS[status]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="history-filters__group">
        <legend>Cycle phase</legend>
        <div className="history-filters__checks">
          {PHASE_ORDER.map((phase) => (
            <label key={phase} className="history-filters__check">
              <input
                type="checkbox"
                checked={filters.phase?.includes(phase) ?? false}
                onChange={(event) => togglePhase(phase, event.target.checked)}
              />
              {PHASE_LABELS[phase]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="history-filters__group history-filters__group--inline">
        <div className="history-filters__field">
          <span className="history-filters__label" aria-hidden="true">
            Appeared
          </span>
          <SegmentedControl<AppearedValue>
            label="Appeared in lessfomo"
            value={appearedValue}
            options={[
              { value: 'any', label: 'Any time' },
              { value: 'in-time', label: 'In time' },
              { value: 'late', label: 'Late' },
            ]}
            onChange={(value) => onChange(withAppearedLate(filters, value === 'any' ? null : value === 'late'))}
          />
        </div>
        <div className="history-filters__field">
          <span className="history-filters__label" aria-hidden="true">
            Lifecycle
          </span>
          <SegmentedControl<LifecycleValue>
            label="Lifecycle"
            value={filters.lifecycle ?? 'all'}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'dead', label: 'Dead' },
            ]}
            onChange={(value) => set({ lifecycle: value === 'all' ? null : value })}
          />
        </div>
        <div className="history-filters__field">
          <label htmlFor={ids.score}>Max score</label>
          <select
            id={ids.score}
            value={filters.minScore ?? ''}
            onChange={(event) => set({ minScore: event.target.value === '' ? null : Number(event.target.value) })}
          >
            <option value="">Any score</option>
            {/* A shared link may carry a threshold the picker does not list; keep it selectable. */}
            {filters.minScore !== null && !(MIN_SCORES as readonly number[]).includes(filters.minScore) ? (
              <option value={filters.minScore}>At least {filters.minScore}</option>
            ) : null}
            {MIN_SCORES.map((score) => (
              <option key={score} value={score}>
                At least {score}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters(filters) ? (
          <button type="button" className="button button--quiet history-filters__reset" onClick={onReset}>
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
