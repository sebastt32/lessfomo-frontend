import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeCycle, makeMover, makeScreening, makeStableCycle, MINT_A, MINT_B } from '../../test/fixtures';
import { MoversTable } from './MoversTable';
import { ScreeningsFeed } from './ScreeningsFeed';

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
    expect(rows[0]).toHaveTextContent('Se desplomó6m 20s para comprar');
    expect(rows[1]).toHaveTextContent('Estable12m hasta ahora');
    expect(rows[2]).toHaveTextContent('Se desplomó3m tarde');
    expect(within(rows[3]!).getByTitle('Todavía no hay datos del ciclo')).toHaveTextContent('—');
    // Selecting opens the token's own view: the buttons are not toggles any more.
    expect(screen.getByRole('button', { name: 'Ver detalle de FROG' })).not.toHaveAttribute('aria-pressed');
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
    expect(frog).toHaveTextContent('CicloDuplicó6m 20s para comprar');
    expect(within(cat!).getByTitle('Todavía no hay datos del ciclo')).toHaveTextContent('—');
  });
});
