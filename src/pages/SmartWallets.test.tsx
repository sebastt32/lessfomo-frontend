import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient, type TokenListQuery } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import {
  makeCounts,
  makeListItem,
  makeMover,
  makeScreening,
  makeSmartWallet,
  makeToken,
  makeWalletRecord,
  makeWalletResponse,
  makeWalletResult,
  MINT_A,
  MINT_B,
  WALLET_A,
} from '../test/fixtures';
import { AppShell } from './AppShell';
import { formatDate } from '../lib/format';

const MINT_DOG = 'So11111111111111111111111111111111111111112';
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route not found');

function renderApp(client: ApiClient, url = '/', minSmartWallets?: number) {
  window.history.replaceState(null, '', url);
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  const view = render(
    <LiveFeedProvider client={client} connect={connect} {...(minSmartWallets ? { minSmartWallets } : {})}>
      <AppShell />
    </LiveFeedProvider>,
  );
  return {
    ...view,
    emit: (event: Parameters<StreamOptions['onEvent']>[0]) => act(() => options?.onEvent(event)),
  };
}

const smartMovers = () =>
  fakeClient({
    getMovers: vi.fn(async () => ({
      at: '2026-11-13T20:05:00.000Z',
      movers: [
        makeMover({ mint: MINT_A, symbol: 'FROG', smartWallets: makeCounts({ count: 6, elite: 1, holding: 1 }) }),
        makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat', smartWallets: makeCounts({ count: 0, elite: 0, holding: 0 }) }),
      ],
    })),
    // The server only returns safety checks of tokens that pass the threshold.
    getScreenings: vi.fn(async () => ({ screenings: [makeScreening({ mint: MINT_DOG, symbol: 'DOG' })] })),
  });

afterEach(() => window.history.replaceState(null, '', '/'));

describe('smart-wallet filter in the live view', () => {
  it('shows only tokens bought by at least five good-history wallets by default, and says so', async () => {
    const client = smartMovers();
    renderApp(client);

    expect(await screen.findByRole('button', { name: 'Show details for FROG' })).toBeInTheDocument();
    const movers = screen.getByRole('region', { name: 'Top movers' });
    expect(within(movers).queryByRole('button', { name: 'Show details for CAT' })).not.toBeInTheDocument();
    const bar = screen.getByRole('region', { name: 'Smart-wallet filter' });
    expect(bar).toHaveTextContent('Showing tokens bought by ≥5 good-history wallets');
    expect(within(bar).getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true');
    expect(client.getMovers).toHaveBeenCalledWith(expect.objectContaining({ minSmartWallets: 5 }));
    expect(client.getScreenings).toHaveBeenCalledWith(expect.objectContaining({ minSmartWallets: 5 }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('1 elite, 1 holding')).toBeInTheDocument();
    const feed = screen.getByRole('region', { name: 'Latest safety checks' });
    expect(within(feed).getByRole('button', { name: 'Show details for DOG' })).toBeInTheDocument();
  });

  it('changes the minimum, keeps it in the URL and explains an empty list', async () => {
    const user = userEvent.setup();
    renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Show details for FROG' });

    await user.click(screen.getByRole('button', { name: '10' }));
    expect(window.location.search).toBe('?minSmartWallets=10');
    expect(screen.getByRole('region', { name: 'Smart-wallet filter' })).toHaveTextContent(
      'Showing tokens bought by ≥10 good-history wallets',
    );
    expect(screen.getByText('No mover passes the smart-wallet filter right now')).toBeInTheDocument();
    expect(screen.getByText(/2 ranked tokens were not bought by enough good-history wallets/)).toBeInTheDocument();
  });

  it('refetches movers and safety checks when the threshold changes', async () => {
    const client = smartMovers();
    const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
    const { rerender } = render(
      <LiveFeedProvider client={client} connect={connect} minSmartWallets={5}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await screen.findByRole('button', { name: 'Show details for FROG' });
    rerender(
      <LiveFeedProvider client={client} connect={connect} minSmartWallets={10}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await waitFor(() =>
      expect(client.getMovers).toHaveBeenLastCalledWith(expect.objectContaining({ minSmartWallets: 10 })),
    );
    expect(client.getScreenings).toHaveBeenLastCalledWith(expect.objectContaining({ minSmartWallets: 10 }));
    // The stream is not reopened for a new threshold.
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('adds a token once a smart-wallet event pushes it over the threshold', async () => {
    const app = renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Show details for FROG' });
    app.emit({
      type: 'smart-wallet',
      data: { mint: MINT_B, smartWallets: makeCounts({ count: 5, elite: 0, holding: 1 }), wallet: makeSmartWallet() },
    });
    const movers = screen.getByRole('region', { name: 'Top movers' });
    expect(within(movers).getByRole('button', { name: 'Show details for CAT' })).toBeInTheDocument();
  });

  it('shows every token and says why when the backend has no smart-wallet data', async () => {
    renderApp(fakeClient());
    expect(await screen.findByRole('button', { name: 'Show details for FROG' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Smart-wallet filter' })).toHaveTextContent(
      'Showing every token: smart-wallet data not available yet',
    );
  });
});

describe('token detail: smart wallets', () => {
  it('lists each good-history wallet and explains its record, loading recent results on demand', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getTokenSmartWallets: vi.fn(async () => ({
        mint: MINT_A,
        smartWallets: [
          makeSmartWallet({
            tierAtEntry: 'good',
            record: makeWalletRecord({ tier: 'elite', isBot: true }),
            entrySeconds: 3,
            boughtSol: 1.5,
            stillHolding: true,
          }),
        ],
      })),
      getWallet: vi.fn(async () =>
        makeWalletResponse({ results: [makeWalletResult({ symbol: 'CAT', pnlSol: 1.5 })] }),
      ),
    });
    renderApp(client);
    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));

    const section = await screen.findByRole('region', { name: 'Smart wallets' });
    expect(await within(section).findByText(/1 good-history wallet/)).toBeInTheDocument();
    expect(section).toHaveTextContent(
      'Why it counts as good: Won 9 of 12 tokens (75%) in the last 7 days, net +14.24 SOL, usually buys 4 s after launch.',
    );
    expect(section).toHaveTextContent('Bought 1.50 SOL 3 s after launch, still holding.');
    expect(within(section).getByText('At entry: Good')).toBeInTheDocument();
    expect(within(section).getByText('Now: Elite')).toBeInTheDocument();
    expect(within(section).getByText('Bot')).toBeInTheDocument();
    expect(section).toHaveTextContent('Past results do not guarantee future ones');
    expect(section).toHaveTextContent('only covers the tokens lessfomo observed');

    const solscan = within(section).getByRole('link', { name: /on Solscan/ });
    expect(solscan).toHaveAttribute('href', `https://solscan.io/account/${WALLET_A}`);
    expect(solscan).toHaveAttribute('target', '_blank');
    expect(solscan).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(section).getByRole('button', { name: `Copy wallet address ${WALLET_A}` })).toBeInTheDocument();

    expect(client.getWallet).not.toHaveBeenCalled();
    await user.click(within(section).getByRole('button', { name: 'Show recent results' }));
    expect(client.getWallet).toHaveBeenCalledWith(WALLET_A, expect.anything());
    const results = await within(section).findByRole('region', { name: 'Recent results' });
    expect(within(results).getByRole('rowheader', { name: 'CAT' })).toBeInTheDocument();
    expect(results).toHaveTextContent('+1.50 SOL');
  });

  it('says smart-wallet data is not available yet on an older backend', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient({ getTokenSmartWallets: vi.fn(async () => Promise.reject(notFound())) }));
    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const section = await screen.findByRole('region', { name: 'Smart wallets' });
    expect(await within(section).findByText(/Smart-wallet data not available yet/)).toBeInTheDocument();
  });
});

describe('history: smart wallets', () => {
  const lastQuery = (client: ApiClient): TokenListQuery =>
    (client.listTokens as ReturnType<typeof vi.fn>).mock.lastCall?.[0] as TokenListQuery;

  it('requests the threshold from the URL, shows counts and sorts by smart wallets', async () => {
    const user = userEvent.setup();
    const client = smartMovers();
    client.listTokens = vi.fn(async () => ({
      tokens: [makeListItem({ smartWallets: makeCounts({ count: 12, elite: 2, holding: 3 }) })],
      page: 1,
      pageSize: 50,
      total: 1,
    }));
    renderApp(client, '/?view=history&minSmartWallets=10&page=3');
    const table = await screen.findByRole('table');
    expect(lastQuery(client)).toMatchObject({ minSmartWallets: 10, page: 3 });
    expect(within(table).getByText('2 elite, 3 holding')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Token history' })).toHaveTextContent(
      'and bought by ≥10 good-history wallets',
    );

    await user.click(screen.getByRole('button', { name: 'Sort by smart wallets, descending' }));
    expect(window.location.search).toBe('?view=history&sort=smartWallets:desc&minSmartWallets=10');
    expect(lastQuery(client)).toMatchObject({ sort: { field: 'smartWallets', direction: 'desc' }, page: 1 });

    await user.click(screen.getByRole('button', { name: '20' }));
    expect(window.location.search).toBe('?view=history&sort=smartWallets:desc&minSmartWallets=20');
  });

  it('says the list is not filtered when the backend sends no smart-wallet data', async () => {
    renderApp(fakeClient({ listTokens: vi.fn(async () => ({ tokens: [makeListItem({ token: makeToken() })], page: 1, pageSize: 50, total: 1 })) }), '/?view=history');
    expect(await screen.findByRole('note')).toHaveTextContent('Smart-wallet data not available yet');
  });
});

describe('insights: does it work?', () => {
  it('shows how success changes with more good wallets, with the cost and date range', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient());
    await user.click(within(screen.getByRole('navigation', { name: 'Views' })).getByRole('link', { name: 'Insights' }));
    expect(window.location.search).toBe('?view=insights');

    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual([
      'None',
      '1 wallet',
      '2 wallets',
      '5+ wallets',
    ]);
    expect(rows[3]).toHaveTextContent('25.0%');
    expect(rows[3]).toHaveTextContent('8.1× vs none');
    expect(rows[3]).toHaveTextContent('(small sample)');
    const panel = screen.getByRole('region', { name: 'Does it work?' });
    expect(panel).toHaveTextContent('3% round-trip cost');
    expect(panel).toHaveTextContent(formatDate('2026-11-09T00:00:00.000Z'));
    expect(panel).toHaveTextContent(formatDate('2026-11-16T00:00:00.000Z'));
  });

  it('says the analysis is not available yet on an older backend', async () => {
    renderApp(fakeClient({ getSmartWalletAnalysis: vi.fn(async () => Promise.reject(notFound())) }), '/?view=insights');
    expect(await screen.findByText('Smart-wallet data not available yet')).toBeInTheDocument();
  });
});
