import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MoversTable } from './MoversTable';
import { formatDate, formatTime } from '../../lib/format';
import { makeLiquidity, makeMover, MINT_A, MINT_B } from '../../test/fixtures';

const movers = [
  makeMover(),
  makeMover({
    mint: MINT_B,
    symbol: 'CAT',
    name: 'Cat Token',
    status: 'failed',
    score: 31,
    metrics: { ...makeMover().metrics, priceChange5mPct: -7.5, uniqueBuyers1m: 3, uniqueBuyers5m: 9 },
  }),
];

describe('MoversTable', () => {
  it('renders one row per mover with rank, metrics and safety status', () => {
    render(<MoversTable movers={movers} selectedMint={null} onSelect={() => {}} />);

    const table = screen.getByRole('table', { name: /top movers ranked by momentum score/i });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);

    const [first, second] = rows as [HTMLElement, HTMLElement];
    expect(within(first).getByRole('rowheader')).toHaveTextContent('FROG');
    expect(first).toHaveTextContent('1');
    expect(first).toHaveTextContent('72');
    expect(first).toHaveTextContent('14 / 41');
    expect(first).toHaveTextContent('0.60');
    expect(first).toHaveTextContent('0.70');
    expect(first).toHaveTextContent('+18.3%');
    expect(first).toHaveTextContent('Passed');

    expect(second).toHaveTextContent('CAT');
    expect(second).toHaveTextContent('−7.5%');
    expect(second).toHaveTextContent('Failed');
  });

  it('links each token to DexScreener and pump.fun in a new tab', () => {
    render(<MoversTable movers={movers} selectedMint={null} onSelect={() => {}} />);

    const dex = screen.getByRole('link', { name: 'Open FROG on DexScreener (new tab)' });
    expect(dex).toHaveAttribute('href', `https://dexscreener.com/solana/${MINT_A}`);
    expect(dex).toHaveAttribute('target', '_blank');
    expect(dex).toHaveAttribute('rel', 'noopener noreferrer');

    const pump = screen.getByRole('link', { name: 'Open CAT on pump.fun (new tab)' });
    expect(pump).toHaveAttribute('href', `https://pump.fun/coin/${MINT_B}`);
    expect(pump).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('selects a token with the keyboard and marks the selected row', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MoversTable movers={movers} selectedMint={MINT_A} onSelect={onSelect} />);

    expect(screen.getByRole('button', { name: 'Show details for FROG' })).toHaveAttribute('aria-pressed', 'true');
    const cat = screen.getByRole('button', { name: 'Show details for CAT' });
    expect(cat).toHaveAttribute('aria-pressed', 'false');

    cat.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(MINT_B);
  });

  it('selects a token when its row is clicked but not when a link is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<MoversTable movers={movers} selectedMint={null} onSelect={onSelect} />);

    await user.click(screen.getByText('+18.3%'));
    expect(onSelect).toHaveBeenCalledWith(MINT_A);

    onSelect.mockClear();
    await user.click(screen.getByRole('link', { name: 'Open FROG on pump.fun (new tab)' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows each token\'s creation date and time and its liquidity, with a dash when the backend omits it', () => {
    render(
      <MoversTable
        movers={[
          makeMover({ liquidity: makeLiquidity() }),
          makeMover({ mint: MINT_B, symbol: 'CAT', liquidity: makeLiquidity({ sol: 90, migrated: true }) }),
          makeMover({ mint: 'old-backend', symbol: 'OLD' }),
        ]}
        selectedMint={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Created' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Liquidity' })).toBeInTheDocument();
    const [frog, cat, old] = within(screen.getByRole('table')).getAllByRole('row').slice(1) as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    const created = within(frog).getByText(formatDate('2026-11-13T20:00:00.000Z')).closest('time');
    expect(created).toHaveAttribute('dateTime', '2026-11-13T20:00:00.000Z');
    expect(created).toHaveTextContent(formatTime('2026-11-13T20:00:00.000Z'));
    expect(frog).toHaveTextContent('42.50 SOL');
    expect(frog).toHaveTextContent('64% curve');
    expect(cat).toHaveTextContent('90.00 SOL');
    expect(within(cat).getByText('Migrated')).toBeInTheDocument();
    expect(old).toHaveTextContent('—');
  });
});
