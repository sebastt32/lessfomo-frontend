import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScreeningsFeed } from './ScreeningsFeed';
import { formatDate, formatTime } from '../../lib/format';
import { makeScreening, MINT_B } from '../../test/fixtures';

const NOW = Date.parse('2026-11-13T20:10:00.000Z');

const screenings = [
  makeScreening({
    mint: MINT_B,
    symbol: 'RUG',
    name: 'Rug Inc',
    status: 'failed',
    failureCodes: ['CREATOR_HOLDS_TOO_MUCH', 'SOMETHING_NEW'],
    top10Pct: 81.2,
    creatorPct: 40,
    totalHolders: 12,
    evaluatedAt: '2026-11-13T20:07:00.000Z',
  }),
  makeScreening({
    status: 'unverified',
    reason: 'RPC rate limited',
    top10Pct: null,
    creatorPct: null,
    totalHolders: null,
    evaluatedAt: '2026-11-13T20:09:30.000Z',
  }),
];

describe('ScreeningsFeed', () => {
  it('renders failure codes, reason, holder stats and relative time', () => {
    render(<ScreeningsFeed screenings={screenings} selectedMint={null} onSelect={() => {}} now={NOW} />);

    const items = within(screen.getByRole('list', { name: /latest safety checks/i })).getAllByRole('listitem');
    const failed = items.find((item) => item.textContent?.includes('RUG'));
    expect(failed).toBeDefined();
    const codes = within(failed!).getByRole('list', { name: 'Failed checks' });
    expect(within(codes).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Creator holds too much',
      'SOMETHING_NEW',
    ]);
    expect(within(codes).getByText('Creator holds too much')).toHaveAttribute('title', 'CREATOR_HOLDS_TOO_MUCH');
    expect(failed).toHaveTextContent('Failed');
    expect(failed).toHaveTextContent('81.2%');
    expect(failed).toHaveTextContent('40.0%');
    expect(failed).toHaveTextContent('12');
    expect(failed).toHaveTextContent('3m ago');

    expect(screen.getByText('RPC rate limited')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('30s ago')).toBeInTheDocument();
  });

  it('selects a token from the feed', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ScreeningsFeed screenings={screenings} selectedMint={null} onSelect={onSelect} now={NOW} />);

    await user.click(screen.getByRole('button', { name: 'Show details for RUG' }));
    expect(onSelect).toHaveBeenCalledWith(MINT_B);
  });

  it('shows the creation date and time when the live feed knows it', () => {
    render(
      <ScreeningsFeed
        screenings={screenings}
        selectedMint={null}
        onSelect={() => {}}
        now={NOW}
        createdAt={{ [MINT_B]: '2026-11-13T19:58:00.000Z' }}
      />,
    );
    const created = screen.getAllByText('Created');
    expect(created).toHaveLength(1);
    const time = screen.getByText(formatDate('2026-11-13T19:58:00.000Z')).closest('time');
    expect(time).toHaveAttribute('title', '2026-11-13T19:58:00.000Z');
    expect(time).toHaveTextContent(formatTime('2026-11-13T19:58:00.000Z'));
  });
});
