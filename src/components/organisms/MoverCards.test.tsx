import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeCounts, makeCycle, makeMover, MINT_A, MINT_B } from '../../test/fixtures';
import { MoverCards } from './MoverCards';

const NOW = Date.parse('2026-11-13T20:14:00.000Z');

describe('MoverCards', () => {
  it('shows one card per mover with the essentials: rank, name, market cap, cycle, wallets, change and safety', () => {
    render(
      <MoverCards
        movers={[
          makeMover({ cycle: makeCycle(), smartWallets: makeCounts({ conviction: 4 }) }),
          makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat Token', status: 'failed', metrics: { ...makeMover().metrics, priceChange5mPct: -7.5 } }),
        ]}
        onSelect={() => undefined}
        now={NOW}
      />,
    );
    const cards = within(screen.getByRole('list', { name: 'Más activos ahora' })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('1');
    expect(cards[0]).toHaveTextContent('FROG');
    expect(cards[0]).toHaveTextContent('32,100 SOL');
    expect(cards[0]).toHaveTextContent('Se desplomó');
    expect(cards[0]).toHaveTextContent('4 mantienen');
    expect(cards[0]).toHaveTextContent('+18.3%');
    expect(cards[0]).toHaveTextContent('Aprobado');
    expect(cards[1]).toHaveTextContent('CAT');
    expect(cards[1]).toHaveTextContent('−7.5%');
    expect(cards[1]).toHaveTextContent('Rechazado');
  });

  it('opens the token when its card is tapped', async () => {
    const onSelect = vi.fn();
    render(<MoverCards movers={[makeMover()]} onSelect={onSelect} now={NOW} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ver detalle de FROG' }));
    expect(onSelect).toHaveBeenCalledWith(MINT_A);
  });

  it('keeps help marks out of the card buttons', () => {
    render(<MoverCards movers={[makeMover({ cycle: makeCycle() })]} onSelect={() => undefined} now={NOW} />);
    const card = screen.getByRole('button', { name: 'Ver detalle de FROG' });
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(card).toHaveTextContent('5 min');
  });
});
