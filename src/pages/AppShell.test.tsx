import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import { makeMover } from '../test/fixtures';
import { stubMatchMedia } from '../test/matchMedia';
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

afterEach(() => window.history.replaceState(null, '', '/'));

describe('AppShell navigation', () => {
  it('switches between the live view and the daily record, keeping the view in the URL', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client);

    const nav = screen.getByRole('navigation', { name: 'Views' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['Live', 'Daily record']);
    expect(within(nav).getByRole('link', { name: 'Live' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Daily record' }));
    expect(window.location.search).toBe('?view=record');
    expect(await screen.findByRole('region', { name: /Daily record/ })).toBeInTheDocument();
    const recordNav = screen.getByRole('navigation', { name: 'Views' });
    expect(within(recordNav).getByRole('link', { name: 'Daily record' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(recordNav).getByRole('link', { name: 'Live' }));
    expect(window.location.search).toBe('');
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('opens Live for the old History and Insights links', async () => {
    for (const view of ['history', 'insights']) {
      const { unmount } = renderApp(fakeClient(), `/?view=${view}&page=2`);
      expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Live' })).toHaveAttribute('aria-current', 'page');
      unmount();
    }
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
    // S1: the token opens in its own view instead of a side panel.
    const panel = await screen.findByRole('article', { name: 'FROG' });
    expect(await within(panel).findByText(/Snapshots are not available for this token yet/)).toBeInTheDocument();
    expect(within(panel).getByText('Liquidity is not reported for this token yet.')).toBeInTheDocument();
    await waitFor(() => expect(client.getStats).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Screener totals' })).not.toBeInTheDocument();
  });
});

describe('small screens', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows cards instead of tables in Live and in the daily record', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderApp(fakeClient());

    const movers = await screen.findByRole('list', { name: 'Top movers' });
    expect(within(movers).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Daily record' }));
    expect(await screen.findByRole('list', { name: /^Tokens of / })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
