import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { makeCycle, makeStableCycle } from '../../test/fixtures';
import { CycleSummary } from './CycleSummary';

/** 12 minutes after the fixture cycle appeared (20:02:00). */
const NOW = Date.parse('2026-11-13T20:14:00.000Z');

/** The value next to a fact label in the summary's list. */
const fact = (label: string) => screen.getByText(label, { selector: 'dt' }).closest('div')!;

describe('CycleSummary', () => {
  it('says in plain language how long the token could be bought and what happened after', () => {
    render(<CycleSummary cycle={makeCycle()} now={NOW} />);
    const summary = screen.getByRole('region', { name: 'Ciclo' });
    expect(summary).toHaveTextContent('Se desplomó');
    expect(summary).not.toHaveTextContent('Llegó tarde');
    expect(summary).toHaveTextContent('Se pudo comprar durante 6 min 20 s antes de la subida');
    expect(summary).toHaveTextContent('con un market cap de 30.00 SOL (precio al aparecer)');
    expect(fact('Subida antes de aparecer')).toHaveTextContent('1.50× su precio de lanzamiento');
    expect(fact('Pico')).toHaveTextContent('3.20× el precio al aparecer');
    expect(fact('Tiempo hasta el pico')).toHaveTextContent('10 min después de aparecer');
    expect(fact('Mayor caída')).toHaveTextContent('62% debajo del pico');
    expect(fact('Último precio')).toHaveTextContent('1.40× el precio al aparecer (+40.0%)');
    expect(summary).toHaveTextContent('nada de esto predice qué hará el precio');
  });

  it('explains the cycle, the time to buy, the price when it appeared and each fact with a "?"', async () => {
    const user = userEvent.setup();
    render(<CycleSummary cycle={makeCycle()} now={NOW} />);
    const summary = screen.getByRole('region', { name: 'Ciclo' });

    for (const topic of [
      'el ciclo',
      'el tiempo para comprar',
      'el precio al aparecer',
      'la subida antes de aparecer',
      'el pico',
      'el tiempo hasta el pico',
      'la mayor caída',
      'el último precio',
    ]) {
      expect(within(summary).getByRole('button', { name: `¿Qué es ${topic}?` })).toBeInTheDocument();
    }

    const peak = within(summary).getByRole('button', { name: '¿Qué es el pico?' });
    expect(peak).toHaveAttribute('aria-expanded', 'false');
    await user.click(peak);
    expect(peak).toHaveAttribute('aria-expanded', 'true');
    expect(within(summary).getByRole('note')).toHaveTextContent('Precio más alto después de duplicarse');

    await user.click(within(summary).getByRole('button', { name: '¿Qué es el tiempo para comprar?' }));
    expect(within(summary).getByRole('note')).toHaveTextContent('antes de que empezara la subida fuerte');
  });

  it('counts up while the token is still stable', () => {
    const view = render(<CycleSummary cycle={makeStableCycle()} now={NOW} />);
    expect(screen.getByText('Estable')).toBeInTheDocument();
    expect(screen.getByText('Sigue estable: 12 min desde que apareció')).toBeInTheDocument();
    view.rerender(<CycleSummary cycle={makeStableCycle()} now={NOW + 7_000} />);
    expect(screen.getByText('Sigue estable: 12 min 7 s desde que apareció')).toBeInTheDocument();
  });

  it('marks a token that appeared after it had already doubled', () => {
    render(
      <CycleSummary cycle={makeCycle({ appearedLate: true, investWindowSeconds: -180, phase: 'exploding' })} now={NOW} />,
    );
    expect(screen.getByText('Duplicó')).toBeInTheDocument();
    expect(screen.getByText('Llegó tarde')).toBeInTheDocument();
    expect(screen.getByText('Apareció 3 min después de haberse duplicado')).toBeInTheDocument();
  });

  it('says cycle data is not available yet when the backend does not report it, and still explains the cycle', () => {
    render(<CycleSummary cycle={null} now={NOW} />);
    const summary = screen.getByRole('region', { name: 'Ciclo' });
    expect(summary).toHaveTextContent('Todavía no hay datos del ciclo');
    expect(summary).not.toHaveTextContent('Se pudo comprar');
    expect(within(summary).getByRole('button', { name: '¿Qué es el ciclo?' })).toBeInTheDocument();
  });
});
