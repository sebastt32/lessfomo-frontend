import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HelpTip } from './HelpTip';

describe('HelpTip', () => {
  it('opens a short explanation with a tap and closes it with another, Escape or a tap outside', async () => {
    const user = userEvent.setup();
    render(
      <p>
        Market cap <HelpTip topic="market cap">Lo que vale el token en total.</HelpTip>
        <button type="button">fuera</button>
      </p>,
    );
    const button = screen.getByRole('button', { name: '¿Qué es market cap?' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Lo que vale el token en total.')).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('note')).toHaveTextContent('Lo que vale el token en total.');
    expect(button).toHaveAttribute('aria-controls', screen.getByRole('note').id);

    await user.click(button);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await user.click(button);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button);
    await user.click(screen.getByRole('button', { name: 'fuera' }));
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('does not open or select what is around it, e.g. a row that opens a token', async () => {
    const user = userEvent.setup();
    let rowClicks = 0;
    render(
      <div onClick={() => (rowClicks += 1)}>
        <HelpTip topic="liquidez">SOL en el mercado.</HelpTip>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: '¿Qué es liquidez?' }));
    expect(rowClicks).toBe(0);
  });
});
