import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient, type TokenListQuery } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { formatDate } from '../lib/format';
import { fakeClient } from '../test/fakeClient';
import { makeCycle, makeCyclesAnalysis, makeListItem, makeStableCycle, makeToken, MINT_B } from '../test/fixtures';
import { AppShell } from './AppShell';

function renderApp(client: ApiClient, url = '/') {
  window.history.replaceState(null, '', url);
  const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
}

const lastQuery = (client: ApiClient): TokenListQuery =>
  (client.listTokens as ReturnType<typeof vi.fn>).mock.lastCall?.[0] as TokenListQuery;

afterEach(() => window.history.replaceState(null, '', '/'));

describe('history: cycle', () => {
  const withCycles = () =>
    fakeClient({
      listTokens: vi.fn(async () => ({
        tokens: [
          makeListItem({ cycle: makeCycle() }),
          makeListItem({ token: makeToken({ mint: MINT_B, symbol: 'CAT' }), cycle: makeStableCycle() }),
        ],
        page: 1,
        pageSize: 50,
        total: 2,
      })),
    });

  it('shows the phase and invest window of each token', async () => {
    renderApp(withCycles(), '/?view=history');
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Crashed6m 20s window');
    expect(within(rows[1]!).getByText('Stable')).toBeInTheDocument();
    expect(screen.queryByText(/Cycle data not available yet/)).not.toBeInTheDocument();
  });

  it('reads the phase and appeared-late filters and the window sort from the URL', async () => {
    const client = withCycles();
    renderApp(client, '/?view=history&phase=stable,exploding&appearedLate=false&sort=investWindow:asc');
    await screen.findByRole('table');
    expect(lastQuery(client)).toMatchObject({
      phase: ['stable', 'exploding'],
      appearedLate: false,
      sort: { field: 'investWindow', direction: 'asc' },
    });
    expect(screen.getByRole('checkbox', { name: 'Stable' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Exploding' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Crashed' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'In time' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', { name: /Invest window/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('keeps the cycle filters and sorts in the URL as they change, back to page 1', async () => {
    const user = userEvent.setup();
    const client = withCycles();
    renderApp(client, '/?view=history&page=3');
    await screen.findByRole('table');

    await user.click(screen.getByRole('checkbox', { name: 'Exploding' }));
    expect(window.location.search).toBe('?view=history&phase=exploding');
    await waitFor(() => expect(lastQuery(client)).toMatchObject({ phase: ['exploding'], page: 1 }));

    await user.click(screen.getByRole('button', { name: 'Late' }));
    expect(window.location.search).toBe('?view=history&phase=exploding&appearedLate=true');
    await waitFor(() => expect(lastQuery(client).appearedLate).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Sort by appeared, descending' }));
    expect(window.location.search).toBe('?view=history&phase=exploding&appearedLate=true&sort=appearedAt:desc');
    await waitFor(() => expect(lastQuery(client).sort).toEqual({ field: 'appearedAt', direction: 'desc' }));

    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(window.location.search).toBe('?view=history&sort=appearedAt:desc');
    await waitFor(() => expect(lastQuery(client).phase).toBeUndefined());
    expect(lastQuery(client).appearedLate).toBeUndefined();
  });

  it('says cycle data is not available yet on a backend that does not report it, with dashes in the rows', async () => {
    renderApp(fakeClient(), '/?view=history');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByTitle('Cycle data not available yet')).toHaveLength(2);
    expect(screen.getByRole('region', { name: 'Token history' })).toHaveTextContent(
      'Cycle data not available yet: this screener API does not report token cycles',
    );
  });
});

describe('insights: cycles', () => {
  it('shows how tokens went through their cycle, from GET /api/analysis/cycles', async () => {
    const client = fakeClient();
    renderApp(client, '/?view=insights');
    const panel = await screen.findByRole('region', { name: 'Cycles' });
    expect(await within(panel).findByText(/491 tokens appeared in lessfomo/)).toBeInTheDocument();
    expect(client.getCyclesAnalysis).toHaveBeenCalledTimes(1);
    expect(panel).toHaveTextContent(formatDate('2026-11-09T00:00:00.000Z'));
    expect(panel).toHaveTextContent('Appeared in time61.5%');
    expect(panel).toHaveTextContent('Appeared late38.5%');
    expect(panel).toHaveTextContent('Never exploded55.8%');
    expect(panel).toHaveTextContent('Crashed31.0%');
    expect(panel).toHaveTextContent('Median invest window6 min 20 s');
    expect(panel).toHaveTextContent('Median peak2.90×');
    expect(panel).toHaveTextContent('Median time to peak12 min');
    expect(panel).toHaveTextContent('Median peak to crash1 min 35 s');

    const buckets = within(within(panel).getByRole('region', { name: 'Tokens by invest window' })).getAllByRole('listitem');
    expect(buckets.map((bucket) => bucket.querySelector('.cycles__label')?.textContent)).toEqual([
      'Appeared late',
      'Under 1 min',
      '1 to 5 min',
      '5 to 15 min',
      '15 to 60 min',
      'Over 1 hour',
    ]);
    expect(buckets[0]).toHaveTextContent('189 tokens');
    expect(buckets[0]).toHaveTextContent('median peak 2.20×');
    expect(buckets[4]).toHaveTextContent('12 tokens (small sample)');
    expect(buckets[5]).toHaveTextContent('0 tokens');
    expect(buckets[5]).toHaveTextContent('median peak —');
    expect(panel).toHaveTextContent('they do not say what the next token will do');
    // The existing analysis is still on the page.
    expect(screen.getByRole('region', { name: 'Does it work?' })).toBeInTheDocument();
  });

  it('shows dashes for statistics that could not be computed', async () => {
    const client = fakeClient({
      getCyclesAnalysis: vi.fn(async () =>
        makeCyclesAnalysis({
          tokens: 0,
          appearedInTimePct: null,
          appearedLatePct: null,
          explodedPct: null,
          neverExplodedPct: null,
          crashedPct: null,
          medianInvestWindowSeconds: null,
          medianPeakX: null,
          medianSecondsToPeak: null,
          medianSecondsPeakToCrash: null,
          windowBuckets: [],
        }),
      ),
    });
    renderApp(client, '/?view=insights');
    const panel = await screen.findByRole('region', { name: 'Cycles' });
    expect(await within(panel).findByText(/0 tokens appeared in lessfomo/)).toBeInTheDocument();
    expect(panel).toHaveTextContent('Appeared in time—');
    expect(panel).toHaveTextContent('Median invest window—');
    expect(panel).toHaveTextContent('Median peak—');
    expect(panel).toHaveTextContent('No token appeared in this period yet');
    expect(within(panel).queryByRole('region', { name: 'Tokens by invest window' })).not.toBeInTheDocument();
  });

  it('says cycle data is not available yet on an older backend, without breaking the other analysis', async () => {
    const client = fakeClient({
      getCyclesAnalysis: vi.fn(async () => Promise.reject(new ApiError(404, 'NOT_FOUND', 'Route not found'))),
    });
    renderApp(client, '/?view=insights');
    const panel = await screen.findByRole('region', { name: 'Cycles' });
    expect(await within(panel).findByText('Cycle data not available yet')).toBeInTheDocument();
    expect(within(panel).queryByRole('alert')).not.toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('offers a retry when the cycles cannot be loaded', async () => {
    const user = userEvent.setup();
    const getCyclesAnalysis = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'))
      .mockResolvedValue(makeCyclesAnalysis());
    renderApp(fakeClient({ getCyclesAnalysis }), '/?view=insights');
    const panel = await screen.findByRole('region', { name: 'Cycles' });
    expect(await within(panel).findByText('Could not load the cycles')).toBeInTheDocument();
    await user.click(within(panel).getByRole('button', { name: 'Try again' }));
    expect(await within(panel).findByText(/491 tokens appeared/)).toBeInTheDocument();
  });
});
