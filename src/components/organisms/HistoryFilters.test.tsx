import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HistoryFilters } from './HistoryFilters';
import { DEFAULT_HISTORY, type HistoryFilters as Filters } from '../../lib/historyQuery';

function renderFilters(filters: Filters = DEFAULT_HISTORY) {
  const onChange = vi.fn<(next: Filters) => void>();
  const onReset = vi.fn();
  const view = render(<HistoryFilters filters={filters} years={[2026, 2025, 2024]} onChange={onChange} onReset={onReset} />);
  const last = () => onChange.mock.lastCall?.[0];
  return { onChange, onReset, last, view };
}

describe('HistoryFilters', () => {
  it('applies a date preset', async () => {
    const user = userEvent.setup();
    const { last } = renderFilters();
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(last()).toEqual({ ...DEFAULT_HISTORY, date: { kind: 'preset', preset: '7d' } });
  });

  it('drills down from a year to a month to a day', async () => {
    const user = userEvent.setup();
    const { last, view, onChange } = renderFilters();
    expect(screen.getByLabelText('Month')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Year'), '2025');
    expect(last()?.date).toEqual({ kind: 'period', year: 2025, month: null, day: null });

    view.rerender(
      <HistoryFilters
        filters={{ ...DEFAULT_HISTORY, date: { kind: 'period', year: 2025, month: null, day: null } }}
        years={[2026, 2025, 2024]}
        onChange={onChange}
        onReset={() => {}}
      />,
    );
    expect(screen.getByLabelText('Day')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Month'), 'February');
    expect(last()?.date).toEqual({ kind: 'period', year: 2025, month: 2, day: null });

    view.rerender(
      <HistoryFilters
        filters={{ ...DEFAULT_HISTORY, date: { kind: 'period', year: 2025, month: 2, day: null } }}
        years={[2026, 2025, 2024]}
        onChange={onChange}
        onReset={() => {}}
      />,
    );
    // February 2025 has 28 days, plus "Any day".
    expect(screen.getByLabelText('Day').querySelectorAll('option')).toHaveLength(29);
    await user.selectOptions(screen.getByLabelText('Day'), '14');
    expect(last()?.date).toEqual({ kind: 'period', year: 2025, month: 2, day: 14 });
  });

  it('applies a custom range and refuses one that ends before it starts', async () => {
    const user = userEvent.setup();
    const { last, onChange } = renderFilters();
    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To');

    await user.type(from, '2026-11-10');
    await user.type(to, '2026-11-01');
    expect(screen.getByRole('alert')).toHaveTextContent('The start date is after the end date.');
    expect(screen.getByRole('button', { name: 'Apply range' })).toBeDisabled();

    await user.clear(to);
    await user.type(to, '2026-11-12');
    await user.click(screen.getByRole('button', { name: 'Apply range' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(last()?.date).toEqual({ kind: 'range', from: '2026-11-10', to: '2026-11-12' });
  });

  it('toggles statuses in canonical order, sets lifecycle and minimum score', async () => {
    const user = userEvent.setup();
    const { last, onChange, view } = renderFilters({ ...DEFAULT_HISTORY, status: ['pending'] });
    await user.click(screen.getByRole('checkbox', { name: 'Failed' }));
    expect(last()?.status).toEqual(['failed', 'pending']);

    view.rerender(
      <HistoryFilters filters={DEFAULT_HISTORY} years={[2026]} onChange={onChange} onReset={() => {}} />,
    );
    await user.click(screen.getByRole('button', { name: 'Dead' }));
    expect(last()?.lifecycle).toBe('dead');
    await user.selectOptions(screen.getByLabelText('Max score'), 'At least 75');
    expect(last()?.minScore).toBe(75);
  });

  it('searches on submit and offers a reset only when filters are active', async () => {
    const user = userEvent.setup();
    const { last, onReset, view, onChange } = renderFilters();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), '  frog {Enter}');
    expect(last()?.q).toBe('frog');

    view.rerender(
      <HistoryFilters filters={{ ...DEFAULT_HISTORY, q: 'frog' }} years={[2026]} onChange={onChange} onReset={onReset} />,
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('frog');
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onReset).toHaveBeenCalled();
  });
});
