import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiquidityMeter } from './Liquidity';
import { makeLiquidity } from '../../test/fixtures';

describe('LiquidityMeter', () => {
  it('shows SOL and the bonding curve progress', () => {
    render(<LiquidityMeter liquidity={makeLiquidity()} />);
    expect(screen.getByText('42.50 SOL')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Bonding curve' });
    expect(bar).toHaveAttribute('aria-valuenow', '64');
    expect(bar).toHaveAttribute('aria-valuetext', '64%');
  });

  it('fills the curve and shows a badge once migrated', () => {
    render(<LiquidityMeter liquidity={makeLiquidity({ bondingCurvePct: null, migrated: true })} />);
    expect(screen.getByText('Migrated')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Bonding curve' })).toHaveAttribute(
      'aria-valuetext',
      'Complete, migrated to PumpSwap',
    );
  });

  it('explains unknown values instead of drawing an empty bar', () => {
    const { rerender } = render(<LiquidityMeter liquidity={makeLiquidity({ sol: null, bondingCurvePct: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Bonding curve progress is not known yet.')).toBeInTheDocument();
    rerender(<LiquidityMeter liquidity={undefined} />);
    expect(screen.getByText('Liquidity is not reported for this token yet.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
