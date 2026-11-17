import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_HISTORY, type HistoryFilters as Filters } from '../../lib/historyQuery';
import { makeCycle, makeListItem, makeMover, makeScreening, makeStableCycle, makeToken, MINT_A, MINT_B } from '../../test/fixtures';
import { HistoryFilters } from './HistoryFilters';
import { MoversTable } from './MoversTable';
import { ScreeningsFeed } from './ScreeningsFeed';
import { TokenHistoryTable } from './TokenHistoryTable';

/** 12 minutes after the fixture cycle appeared (20:02:00). */
const NOW = Date.parse('2026-11-13T20:14:00.000Z');

describe('cycle in the lists', () => {
  it('shows the phase and the invest window of each mover, and a dash without cycle data', () => {
    const movers = [
      makeMover({ cycle: makeCycle() }),
      makeMover({ mint: MINT_B, symbol: 'CAT', cycle: makeStableCycle() }),
      makeMover({ mint: 'late', symbol: 'DOG', cycle: makeCycle({ appearedLate: true, investWindowSeconds: -180 }) }),
      makeMover({ mint: 'old', symbol: 'OLD' }),
    ];
    render(<MoversTable movers={movers} onSelect={() => {}} now={NOW} />);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Crashed6m 20s window');
    expect(rows[1]).toHaveTextContent('Stable12m so far');
    expect(rows[2]).toHaveTextContent('Crashed3m late');
    expect(within(rows[3]!).getByTitle('Cycle data not available yet')).toHaveTextContent('—');
    // Selecting opens the token's own view: the buttons are not toggles any more.
    expect(screen.getByRole('button', { name: 'Show details for FROG' })).not.toHaveAttribute('aria-pressed');
  });

  it('shows the cycle of each safety check when it is known', () => {
    render(
      <ScreeningsFeed
        screenings={[makeScreening(), makeScreening({ mint: MINT_B, symbol: 'CAT' })]}
        onSelect={() => {}}
        now={NOW}
        cycles={{ [MINT_A]: makeCycle({ phase: 'exploding', crashAt: null }) }}
      />,
    );
    const [frog, cat] = screen.getAllByRole('listitem');
    expect(frog).toHaveTextContent('CycleExploding6m 20s window');
    expect(within(cat!).getByTitle('Cycle data not available yet')).toHaveTextContent('—');
  });

  it('shows when each token appeared and its window in the history, sortable both ways', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const view = render(
      <TokenHistoryTable
        items={[makeListItem({ cycle: makeCycle() }), makeListItem({ token: makeToken({ mint: MINT_B, symbol: 'CAT' }) })]}
        onSelect={() => {}}
        sort={{ field: 'detectedAt', direction: 'desc' }}
        onSortChange={onSortChange}
        now={NOW}
      />,
    );
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]!).getByTitle('2026-11-13T20:02:00.000Z')).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent('Crashed6m 20s window');
    expect(within(rows[1]!).getAllByTitle('Cycle data not available yet')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Sort by invest window, descending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'investWindow', direction: 'desc' });
    await user.click(screen.getByRole('button', { name: 'Sort by appeared, descending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'appearedAt', direction: 'desc' });

    view.rerender(
      <TokenHistoryTable
        items={[makeListItem({ cycle: makeCycle() })]}
        onSelect={() => {}}
        sort={{ field: 'investWindow', direction: 'desc' }}
        onSortChange={onSortChange}
        now={NOW}
      />,
    );
    expect(screen.getByRole('columnheader', { name: /Invest window/ })).toHaveAttribute('aria-sort', 'descending');
    await user.click(screen.getByRole('button', { name: 'Sort by invest window, ascending' }));
    expect(onSortChange).toHaveBeenLastCalledWith({ field: 'investWindow', direction: 'asc' });
  });
});

describe('HistoryFilters: cycle', () => {
  function renderFilters(filters: Filters = DEFAULT_HISTORY) {
    const onChange = vi.fn();
    render(<HistoryFilters filters={filters} years={[2026]} onChange={onChange} onReset={() => {}} />);
    return { onChange, last: () => onChange.mock.lastCall?.[0] as Filters };
  }

  it('filters by cycle phase, in canonical order, and removes the filter when nothing is checked', async () => {
    const user = userEvent.setup();
    const { last } = renderFilters({ ...DEFAULT_HISTORY, phase: ['crashed'] });
    expect(screen.getByRole('checkbox', { name: 'Crashed' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Stable' })).not.toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Stable' }));
    expect(last()).toEqual({ ...DEFAULT_HISTORY, phase: ['stable', 'crashed'] });
    await user.click(screen.getByRole('checkbox', { name: 'Crashed' }));
    expect(last()).toEqual(DEFAULT_HISTORY);
    expect(last()).not.toHaveProperty('phase');
  });

  it('filters by whether the token appeared in time or late', async () => {
    const user = userEvent.setup();
    const { last } = renderFilters();
    const group = screen.getByRole('group', { name: 'Appeared in lessfomo' });
    expect(within(group).getByRole('button', { name: 'Any time' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(group).getByRole('button', { name: 'Late' }));
    expect(last()).toEqual({ ...DEFAULT_HISTORY, appearedLate: true });
    await user.click(within(group).getByRole('button', { name: 'In time' }));
    expect(last()).toEqual({ ...DEFAULT_HISTORY, appearedLate: false });
  });

  it('shows the active appeared-late filter and clears it with "Any time"', async () => {
    const user = userEvent.setup();
    const { last } = renderFilters({ ...DEFAULT_HISTORY, appearedLate: true });
    const group = screen.getByRole('group', { name: 'Appeared in lessfomo' });
    expect(within(group).getByRole('button', { name: 'Late' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'Any time' }));
    expect(last()).not.toHaveProperty('appearedLate');
  });
});
