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
        dayLabel="13 de noviembre de 2026"
        monthLabel="noviembre de 2026"
        data={{
          tokens: [hit, tracking],
          day: { tokens: 2, hits: 1, pct: 50 },
          month: { tokens: 40, hits: 9, pct: 22.5 },
        }}
        now={NOW}
        onSelect={() => undefined}
      />,
    );

    const day = screen.getByRole('group', { name: 'Éxito el 13 de noviembre de 2026' });
    expect(day).toHaveTextContent('50.0%');
    expect(day).toHaveTextContent('1 de 2 tokens llegaron a 2× después de aparecer');
    expect(day).toHaveTextContent('1 token todavía está en seguimiento, así que este porcentaje todavía puede subir');
    const month = screen.getByRole('group', { name: 'Éxito en noviembre de 2026' });
    expect(month).toHaveTextContent('22.5%');
    expect(month).toHaveTextContent('9 de 40 tokens llegaron a 2× después de aparecer');

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/HIT.*3\.20×.*1\.40×.*Llegó a 2×/),
      expect.stringMatching(/WAIT.*—.*0\.80×.*En seguimiento/),
    ]);
  });

  it('shows the same tokens as cards on small screens, opened with a tap', () => {
    const onSelect = vi.fn();
    render(
      <DailyRecord
        dayLabel="13 de noviembre de 2026"
        monthLabel="noviembre de 2026"
        data={{ tokens: [hit, tracking], day: { tokens: 2, hits: 1, pct: 50 }, month: { tokens: 40, hits: 9, pct: 22.5 } }}
        now={NOW}
        onSelect={onSelect}
        layout="cards"
      />,
    );
    expect(screen.queryByRole('table')).toBeNull();
    const cards = within(screen.getByRole('list', { name: 'Tokens del 13 de noviembre de 2026' })).getAllByRole('listitem');
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringMatching(/HIT.*Llegó a 2×.*Pico3\.20×.*Último1\.40×/),
      expect.stringMatching(/WAIT.*En seguimiento.*Pico—.*Último0\.80×/),
    ]);
    fireEvent.click(within(cards[1]!).getByRole('button', { name: 'Ver detalle de WAIT' }));
    expect(onSelect).toHaveBeenCalledWith(MINT_B);
  });

  it('opens a token from its row', () => {
    const onSelect = vi.fn();
    render(
      <DailyRecord
        dayLabel="13 de noviembre de 2026"
        monthLabel="noviembre de 2026"
        data={{ tokens: [hit], day: { tokens: 1, hits: 1, pct: 100 }, month: { tokens: 1, hits: 1, pct: 100 } }}
        now={NOW}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de HIT' }));
    expect(onSelect).toHaveBeenCalledWith(MINT_A);
  });

  it('says so when no token appeared that day', () => {
    render(
      <DailyRecord
        dayLabel="13 de noviembre de 2026"
        monthLabel="noviembre de 2026"
        data={{ tokens: [], day: { tokens: 0, hits: 0, pct: null }, month: { tokens: 0, hits: 0, pct: null } }}
        now={NOW}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText('Ningún token apareció en lessfomo este día.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Éxito el 13 de noviembre de 2026' })).toHaveTextContent('—');
    expect(screen.queryByRole('table')).toBeNull();
  });
});

describe('DailyRecord help', () => {
  const data = { tokens: [hit], day: { tokens: 1, hits: 1, pct: 100 }, month: { tokens: 1, hits: 1, pct: 100 } };

  it('explains success and every column of the table, without opening the token', async () => {
    const onSelect = vi.fn();
    render(<DailyRecord dayLabel="13 de noviembre de 2026" monthLabel="noviembre de 2026" data={data} now={NOW} onSelect={onSelect} />);

    const success = within(screen.getByRole('group', { name: 'Éxito el 13 de noviembre de 2026' }));
    fireEvent.click(success.getByRole('button', { name: '¿Qué es el éxito?' }));
    expect(screen.getByRole('note')).toHaveTextContent(/2×/);

    const table = within(screen.getByRole('table'));
    for (const topic of ['el market cap al aparecer', 'el pico', 'el último precio', 'el resultado']) {
      expect(table.getByRole('button', { name: `¿Qué es ${topic}?` }).closest('th')).toHaveAttribute('scope', 'col');
    }
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    fireEvent.click(table.getByRole('button', { name: '¿Qué es el pico?' }));
    expect(screen.getByRole('note')).toHaveTextContent(/más alto/);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('explains success on small screens too, outside the card buttons', () => {
    render(
      <DailyRecord dayLabel="13 de noviembre de 2026" monthLabel="noviembre de 2026" data={data} now={NOW} onSelect={() => undefined} layout="cards" />,
    );
    expect(screen.getAllByRole('button', { name: '¿Qué es el éxito?' }).length).toBeGreaterThan(0);
    const card = screen.getByRole('button', { name: 'Ver detalle de HIT' });
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('DayNavigator', () => {
  it('moves one day back or forward, never past today, and jumps to today', () => {
    const onChange = vi.fn();
    const view = render(<DayNavigator day="2026-11-16" today="2026-11-17" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-15');
    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-17');
    fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-17');
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-11-02' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-11-02');

    view.rerender(<DayNavigator day="2026-11-17" today="2026-11-17" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Hoy' })).toBeNull();
  });

  it('ignores an empty or future date from the picker', () => {
    const onChange = vi.fn();
    render(<DayNavigator day="2026-11-16" today="2026-11-17" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '2026-11-20' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
