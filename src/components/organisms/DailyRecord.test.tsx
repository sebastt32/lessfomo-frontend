import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MINT_A, MINT_B, makeCycle, makeListItem, makeStableCycle, makeToken } from '../../test/fixtures';
import { DayNavigator } from '../molecules/DayNavigator';
import { DailyRecord } from './DailyRecord';

/** 12 minutes after the fixture cycles appeared (20:02:00). */
const NOW = Date.parse('2026-11-13T20:14:00.000Z');

const hit = makeListItem({ token: makeToken({ mint: MINT_A, symbol: 'HIT', name: 'Hit token' }), cycle: makeCycle() });
const tracking = makeListItem({
  token: makeToken({ mint: MINT_B, symbol: 'WAIT', name: 'Waiting token' }),
  cycle: makeStableCycle({ lastPriceX: 0.8 }),
});

describe('DailyRecord', () => {
  it('shows the success of the day and of the month, and every token with its outcome', () => {
    render(
      <DailyRecord
        dayLabel="November 13, 2026"
        monthLabel="November 2026"
        data={{
          tokens: [hit, tracking],
          day: { tokens: 2, hits: 1, pct: 50 },
          month: { tokens: 40, hits: 9, pct: 22.5 },
        }}
        now={NOW}
        onSelect={() => undefined}
      />,
    );

    const day = screen.getByRole('group', { name: 'Success on November 13, 2026' });
    expect(day).toHaveTextContent('50.0%');
    expect(day).toHaveTextContent('1 of 2 tokens reached 2× after appearing');
    expect(day).toHaveTextContent('1 token is still being tracked, so this share can still go up');
    const month = screen.getByRole('group', { name: 'Success in November 2026' });
    expect(month).toHaveTextContent('22.5%');
    expect(month).toHaveTextContent('9 of 40 tokens reached 2× after appearing');

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/HIT.*3\.20×.*1\.40×.*Reached 2×/),
      expect.stringMatching(/WAIT.*—.*0\.80×.*Tracking/),
    ]);
  });

  it('opens a token from its row', () => {
    const onSelect = vi.fn();
    render(
      <DailyRecord
        dayLabel="November 13, 2026"
        monthLabel="November 2026"
        data={{ tokens: [hit], day: { tokens: 1, hits: 1, pct: 100 }, month: { tokens: 1, hits: 1, pct: 100 } }}
        now={NOW}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /HIT/ }));
    expect(onSelect).toHaveBeenCalledWith(MINT_A);
  });

  it('says so when no token appeared that day', () => {
    render(
      <DailyRecord
        dayLabel="November 13, 2026"
        monthLabel="November 2026"
        data={{ tokens: [], day: { tokens: 0, hits: 0, pct: null }, month: { tokens: 0, hits: 0, pct: null } }}
        now={NOW}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('No token appeared in lessfomo on this day.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Success on November 13, 2026' })).toHaveTextContent('—');
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('DayNavigator', () => {
  it('moves one day back or forward, never past today, and jumps to today', () => {
    const onChange = vi.fn();
    const view = render(<DayNavigator day="2026-11-16" today="2026-11-17" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-15');
    fireEvent.click(screen.getByRole('button', { name: 'Next day' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-17');
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-17');
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-11-02' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-11-02');

    view.rerender(<DayNavigator day="2026-11-17" today="2026-11-17" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
  });

  it('ignores an empty or future date from the picker', () => {
    const onChange = vi.fn();
    render(<DayNavigator day="2026-11-16" today="2026-11-17" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '2026-11-20' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
