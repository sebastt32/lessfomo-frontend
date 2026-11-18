import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeCycle, makeStableCycle } from '../../test/fixtures';
import { CycleSummary } from './CycleSummary';

/** 12 minutes after the fixture cycle appeared (20:02:00). */
const NOW = Date.parse('2026-11-13T20:14:00.000Z');

describe('CycleSummary', () => {
  it('says in plain language how long the token could be bought and what happened after', () => {
    render(<CycleSummary cycle={makeCycle()} now={NOW} />);
    const summary = screen.getByRole('region', { name: 'Cycle' });
    expect(summary).toHaveTextContent('Crashed');
    expect(summary).not.toHaveTextContent('Appeared late');
    expect(summary).toHaveTextContent('Could be bought for 6 min 20 s before the run-up');
    expect(summary).toHaveTextContent('with a market cap of 30.00 SOL (the base price)');
    expect(summary).toHaveTextContent('Rise before appearing1.50× its launch price');
    expect(summary).toHaveTextContent('Peak3.20× the base price');
    expect(summary).toHaveTextContent('Time to peak10 min after it appeared');
    expect(summary).toHaveTextContent('Deepest fall62% below the peak');
    expect(summary).toHaveTextContent('Last price1.40× the base price (+40.0%)');
    expect(summary).toHaveTextContent('nothing here predicts what the price does next');
  });

  it('counts up while the token is still stable', () => {
    const view = render(<CycleSummary cycle={makeStableCycle()} now={NOW} />);
    expect(screen.getByText('Stable')).toBeInTheDocument();
    expect(screen.getByText('Still stable: 12 min since it appeared')).toBeInTheDocument();
    view.rerender(<CycleSummary cycle={makeStableCycle()} now={NOW + 7_000} />);
    expect(screen.getByText('Still stable: 12 min 7 s since it appeared')).toBeInTheDocument();
  });

  it('marks a token that appeared after it had already exploded', () => {
    render(
      <CycleSummary cycle={makeCycle({ appearedLate: true, investWindowSeconds: -180, phase: 'exploding' })} now={NOW} />,
    );
    expect(screen.getByText('Exploding')).toBeInTheDocument();
    expect(screen.getByText('Appeared late')).toBeInTheDocument();
    expect(screen.getByText('Appeared 3 min after it had already exploded')).toBeInTheDocument();
  });

  it('says cycle data is not available yet when the backend does not report it', () => {
    render(<CycleSummary cycle={null} now={NOW} />);
    const summary = screen.getByRole('region', { name: 'Cycle' });
    expect(summary).toHaveTextContent('Cycle data not available yet');
    expect(summary).not.toHaveTextContent('Could be bought');
  });
});
