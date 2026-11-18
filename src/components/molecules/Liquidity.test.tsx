import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiquidityMeter } from './Liquidity';
import { makeLiquidity } from '../../test/fixtures';

describe('LiquidityMeter', () => {
  it('shows SOL and the bonding curve progress', () => {
    render(<LiquidityMeter liquidity={makeLiquidity()} />);
    expect(screen.getByText('42.50 SOL')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Curva de pump.fun' });
    expect(bar).toHaveAttribute('aria-valuenow', '64');
    expect(bar).toHaveAttribute('aria-valuetext', '64%');
  });

  it('fills the curve and shows a badge once migrated', () => {
    render(<LiquidityMeter liquidity={makeLiquidity({ bondingCurvePct: null, migrated: true })} />);
    expect(screen.getByText('Graduado')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Curva de pump.fun' })).toHaveAttribute(
      'aria-valuetext',
      'Completa, graduado a PumpSwap',
    );
  });

  it('explains unknown values instead of drawing an empty bar', () => {
    const { rerender } = render(<LiquidityMeter liquidity={makeLiquidity({ sol: null, bondingCurvePct: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Todavía no se sabe el avance de la curva.')).toBeInTheDocument();
    rerender(<LiquidityMeter liquidity={undefined} />);
    expect(screen.getByText('Todavía no hay datos de liquidez de este token.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('explains liquidity and the curve with a "?" next to each', async () => {
    const user = userEvent.setup();
    render(<LiquidityMeter liquidity={makeLiquidity()} />);
    await user.click(screen.getByRole('button', { name: '¿Qué es la liquidez?' }));
    expect(screen.getByRole('note')).toHaveTextContent('El dinero disponible en el mercado del token');
    await user.click(screen.getByRole('button', { name: '¿Qué es la curva de pump.fun?' }));
    expect(screen.getByRole('note')).toHaveTextContent('al llegar al 100% deja pump.fun');
  });
});
