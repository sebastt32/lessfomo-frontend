import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient, type TokenListQuery } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import { makeListItem, makeMover, makeToken, MINT_B } from '../test/fixtures';
import { AppShell } from './AppShell';

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route not found');

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

describe('AppShell navigation', () => {
  it('switches between the live view and the history list, keeping the view in the URL', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client);

    const nav = screen.getByRole('navigation', { name: 'Views' });
    expect(within(nav).getByRole('link', { name: 'Live' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'History' }));
    expect(window.location.search).toBe('?view=history');
    expect(await screen.findByRole('region', { name: 'Token history' })).toBeInTheDocument();
    const historyNav = screen.getByRole('navigation', { name: 'Views' });
    expect(within(historyNav).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(historyNav).getByRole('link', { name: 'Live' }));
    expect(window.location.search).toBe('');
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('shows the database totals in the header of both views', async () => {
    const client = fakeClient();
    renderApp(client);
    const totals = await screen.findByRole('region', { name: 'Screener totals' });
    expect(totals).toHaveTextContent('1,234 tokens tracked since');
    expect(totals).toHaveTextContent('Active210');
    expect(totals).toHaveTextContent('Migrated3');
    expect(totals).toHaveTextContent('Pending214');
    expect(totals).toHaveTextContent('Trades456,789');
    expect(totals).toHaveTextContent('Snapshots23,456');
  });

  it('keeps the live view working on a backend without the new endpoints', async () => {
    const client = fakeClient({
      getStats: vi.fn(async () => Promise.reject(notFound())),
      getTokenSnapshots: vi.fn(async () => Promise.reject(new ApiError(400, 'INVALID_MINT', 'Mint is not a base58 address'))),
      // An old backend sends movers without liquidity.
      getMovers: vi.fn(async () => {
        const { liquidity: _drop, ...mover } = makeMover();
        return { at: '2026-11-13T20:05:00.000Z', movers: [mover] };
      }),
    });
    const user = userEvent.setup();
    renderApp(client);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const panel = await screen.findByRole('region', { name: 'FROG' });
    expect(await within(panel).findByText(/Snapshots are not available for this token yet/)).toBeInTheDocument();
    expect(within(panel).getByText('Liquidity is not reported for this token yet.')).toBeInTheDocument();
    await waitFor(() => expect(client.getStats).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Screener totals' })).not.toBeInTheDocument();
  });
});

describe('History view', () => {
  it('reads filters from the URL and sends them to GET /api/tokens', async () => {
    const client = fakeClient();
    renderApp(client, '/?view=history&range=2025-02&status=failed&lifecycle=dead&minScore=50&q=frog&sort=maxScore:asc&page=2');

    await screen.findByRole('region', { name: 'Token history' });
    expect(lastQuery(client)).toEqual({
      from: new Date(2025, 1, 1).toISOString(),
      to: new Date(2025, 2, 1).toISOString(),
      status: ['failed'],
      lifecycle: 'dead',
      minScore: 50,
      // Decision D4: the history list asks for tokens bought by at least one good-history wallet by default.
      minSmartWallets: 5,
      q: 'frog',
      sort: { field: 'maxScore', direction: 'asc' },
      page: 2,
      pageSize: 50,
    });
    expect(screen.getByLabelText('Year')).toHaveValue('2025');
    expect(screen.getByLabelText('Month')).toHaveValue('2');
    expect(screen.getByRole('checkbox', { name: 'Failed' })).toBeChecked();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('frog');
  });

  it('updates the query and the URL when a filter changes, back to page 1', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client, '/?view=history&page=3');
    await screen.findByRole('button', { name: 'Show details for FROG' });

    await user.click(screen.getByRole('button', { name: 'This year' }));
    await waitFor(() => expect(lastQuery(client).page).toBe(1));
    const year = new Date().getFullYear();
    expect(lastQuery(client)).toMatchObject({ from: new Date(year, 0, 1).toISOString(), to: new Date(year + 1, 0, 1).toISOString() });
    expect(window.location.search).toBe('?view=history&range=this-year');

    await user.click(screen.getByRole('checkbox', { name: 'Passed' }));
    await waitFor(() => expect(lastQuery(client).status).toEqual(['passed']));
    expect(window.location.search).toBe('?view=history&range=this-year&status=passed');

    // Back restores the previous filters.
    window.history.back();
    await waitFor(() => expect(window.location.search).toBe('?view=history&range=this-year'));
    await waitFor(() => expect(lastQuery(client).status).toBeUndefined());
  });

  it('paginates with the total count', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      listTokens: vi.fn(async (query: TokenListQuery) => ({
        tokens: [makeListItem({ token: makeToken({ symbol: `P${query.page}` }) })],
        page: query.page ?? 1,
        pageSize: 50,
        total: 120,
      })),
    });
    renderApp(client, '/?view=history');

    const pages = await screen.findByRole('navigation', { name: 'Token history pages' });
    expect(pages).toHaveTextContent('Showing 1–50 of 120');
    expect(pages).toHaveTextContent('Page 1 of 3');
    expect(within(pages).getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(within(pages).getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('button', { name: 'Show details for P2' })).toBeInTheDocument();
    expect(window.location.search).toBe('?view=history&page=2');
    expect(screen.getByRole('navigation', { name: 'Token history pages' })).toHaveTextContent('Showing 51–100 of 120');
    expect(screen.getByRole('region', { name: 'Token history' })).toHaveTextContent('120 tokens created at any time');
  });

  it('opens the token detail with its snapshots when a row is selected', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client, '/?view=history');

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const panel = await screen.findByRole('region', { name: 'FROG' });
    const snapshots = await within(panel).findByRole('region', { name: 'Snapshots of FROG' });
    const rows = within(snapshots).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(['At creation', '5 min']);
    expect(rows[0]).toHaveTextContent('3 / 1');
    expect(rows[0]).toHaveTextContent('92.5%');
    expect(rows[0]).toHaveTextContent('Trades');
    expect(within(panel).getByText('Active')).toBeInTheDocument();
    // Not on the live ranking: liquidity comes from the newest snapshot.
    expect(within(panel).getByRole('progressbar', { name: 'Bonding curve' })).toHaveAttribute('aria-valuenow', '2');
  });

  it('explains an empty result and lets the reader reset the filters', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ listTokens: vi.fn(async () => ({ tokens: [], page: 1, pageSize: 50, total: 0 })) });
    renderApp(client, '/?view=history&lifecycle=dead');

    expect(await screen.findByText('No tokens match these filters')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(window.location.search).toBe('?view=history');
  });

  it('shows the API message for INVALID_QUERY and other errors with a retry', async () => {
    const user = userEvent.setup();
    const listTokens = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(400, 'INVALID_QUERY', 'minScore must be between 0 and 100'))
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'))
      .mockResolvedValue({ tokens: [makeListItem({ token: makeToken({ mint: MINT_B, symbol: 'CAT' }) })], page: 1, pageSize: 50, total: 1 });
    const client = fakeClient({ listTokens });
    renderApp(client, '/?view=history&minScore=90');

    expect(await screen.findByText('The screener rejected these filters')).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('minScore must be between 0 and 100');
    await user.click(within(alert).getByRole('button', { name: 'Reset filters' }));
    expect(await screen.findByText('Could not load the token history')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Show details for CAT' })).toBeInTheDocument();
  });

  it('says the list is not available yet on a backend without GET /api/tokens', async () => {
    const client = fakeClient({ listTokens: vi.fn(async () => Promise.reject(notFound())) });
    renderApp(client, '/?view=history');
    expect(await screen.findByText('The token history is not available yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
