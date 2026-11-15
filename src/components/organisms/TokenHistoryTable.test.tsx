import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TokenHistoryTable } from './TokenHistoryTable';
import { formatDate, formatTime } from '../../lib/format';
import { makeListItem, makeLiquidity, makeToken, MINT_A, MINT_B } from '../../test/fixtures';

const NOW = Date.parse('2026-11-13T20:10:00.000Z');
const items = [
  makeListItem(),
  makeListItem({
    token: makeToken({ mint: MINT_B, symbol: 'CAT', name: 'Cat Token', detectedAt: '2026-01-02T08:30:00.000Z' }),
    status: 'failed',
    lifecycle: 'dead',
    liquidity: makeLiquidity({ sol: 85.1, bondingCurvePct: 100, migrated: true }),
    maxScore: null,
    holders: null,
    lastTradeAt: null,
  }),
];

function renderTable(overrides: Partial<Parameters<typeof TokenHistoryTable>[0]> = {}) {
  const props = {
    items,
    selectedMint: null,
    onSelect: vi.fn(),
    sort: { field: 'detectedAt' as const, direction: 'desc' as const },
    onSortChange: vi.fn(),
    now: NOW,
    ...overrides,
  };
  render(<TokenHistoryTable {...props} />);
  return props;
}

describe('TokenHistoryTable', () => {
  it('renders one row per token with creation date and time, liquidity and lifecycle', () => {
    renderTable();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const [frog, cat] = rows as [HTMLElement, HTMLElement];

    const created = within(frog).getByText(formatDate('2026-11-13T20:00:00.000Z')).closest('time');
    expect(created).toHaveAttribute('title', '2026-11-13T20:00:00.000Z');
    expect(created).toHaveTextContent(formatTime('2026-11-13T20:00:00.000Z'));
    expect(within(frog).getByRole('rowheader')).toHaveTextContent('FROG');
    expect(frog).toHaveTextContent('Passed');
    expect(frog).toHaveTextContent('Active');
    expect(frog).toHaveTextContent('42.50 SOL');
    expect(frog).toHaveTextContent('64% curve');
    expect(frog).toHaveTextContent('32.10 SOL');
    expect(frog).toHaveTextContent('1,235 SOL');
    expect(frog).toHaveTextContent('82');
    expect(frog).toHaveTextContent('154');
    expect(frog).toHaveTextContent('1m ago');

    expect(cat).toHaveTextContent('Failed');
    expect(cat).toHaveTextContent('Dead');
    expect(cat).toHaveTextContent('85.10 SOL');
    expect(within(cat).getByText('Migrated')).toBeInTheDocument();
    expect(cat).not.toHaveTextContent('curve');
    expect(cat).toHaveTextContent('No trades');
  });

  it('marks the sorted column and flips or switches the sort from the headers', async () => {
    const user = userEvent.setup();
    const props = renderTable();
    expect(screen.getByRole('columnheader', { name: /created/i })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /max score/i })).not.toHaveAttribute('aria-sort');

    await user.click(screen.getByRole('button', { name: 'Sort by created, ascending' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith({ field: 'detectedAt', direction: 'asc' });
    await user.click(screen.getByRole('button', { name: 'Sort by liquidity, descending' }));
    expect(props.onSortChange).toHaveBeenLastCalledWith({ field: 'liquidity', direction: 'desc' });
  });

  it('selects a token by row click or keyboard and marks the selected row', async () => {
    const user = userEvent.setup();
    const props = renderTable({ selectedMint: MINT_A });
    expect(screen.getByRole('button', { name: 'Show details for FROG' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByText('85.10 SOL'));
    expect(props.onSelect).toHaveBeenLastCalledWith(MINT_B);

    screen.getByRole('button', { name: 'Show details for FROG' }).focus();
    await user.keyboard('{Enter}');
    expect(props.onSelect).toHaveBeenLastCalledWith(MINT_A);
    expect(props.onSelect).toHaveBeenCalledTimes(2);
  });
});
