import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import {
  makeCounts,
  makeMover,
  makeScreening,
  makeSmartWallet,
  makeWalletRecord,
  makeWalletResponse,
  makeWalletResult,
  MINT_A,
  MINT_B,
  WALLET_A,
  WALLET_B,
} from '../test/fixtures';
import { AppShell } from './AppShell';

const MINT_DOG = 'So11111111111111111111111111111111111111112';
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route not found');

function renderApp(client: ApiClient, url = '/', minConvictionWallets?: number) {
  window.history.replaceState(null, '', url);
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  const view = render(
    <LiveFeedProvider client={client} connect={connect} {...(minConvictionWallets ? { minConvictionWallets } : {})}>
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
        makeMover({ mint: MINT_A, symbol: 'FROG', smartWallets: makeCounts({ count: 7, elite: 1, holding: 2, conviction: 3 }) }),
        // Plenty of good wallets, but they are flippers: not enough conviction wallets.
        makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat', smartWallets: makeCounts({ count: 9, elite: 0, holding: 0, conviction: 1 }) }),
      ],
    })),
    // The server only returns safety checks of tokens that pass the threshold.
    getScreenings: vi.fn(async () => ({ screenings: [makeScreening({ mint: MINT_DOG, symbol: 'DOG' })] })),
  });

afterEach(() => window.history.replaceState(null, '', '/'));

// S7/D7: the filter moved from good-history wallets (default 5) to conviction wallets (default 3).
describe('conviction-wallet filter in the live view', () => {
  it('shows only tokens bought by at least three conviction wallets by default, and says so', async () => {
    const client = smartMovers();
    renderApp(client);

    expect(await screen.findByRole('button', { name: 'Show details for FROG' })).toBeInTheDocument();
    const movers = screen.getByRole('region', { name: 'Top movers' });
    expect(within(movers).queryByRole('button', { name: 'Show details for CAT' })).not.toBeInTheDocument();
    const bar = screen.getByRole('region', { name: 'Smart-wallet filter' });
    expect(bar).toHaveTextContent('Showing tokens bought by ≥3 conviction wallets');
    expect(bar).toHaveTextContent('Flippers, which sell within 2 minutes, never count');
    expect(within(bar).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(bar).getAllByRole('button').map((b) => b.textContent)).toEqual(['3', '5', '10+']);
    expect(client.getMovers).toHaveBeenCalledWith(expect.objectContaining({ minConvictionWallets: 3 }));
    expect(client.getScreenings).toHaveBeenCalledWith(expect.objectContaining({ minConvictionWallets: 3 }));
    expect(client.getMovers).not.toHaveBeenCalledWith(expect.objectContaining({ minSmartWallets: expect.anything() }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('3 conviction').parentElement).toHaveTextContent('3 conviction · 7 good · 2 holding');
    const feed = screen.getByRole('region', { name: 'Latest safety checks' });
    expect(within(feed).getByRole('button', { name: 'Show details for DOG' })).toBeInTheDocument();
  });

  it('changes the minimum, keeps it in the URL and explains an empty list', async () => {
    const user = userEvent.setup();
    renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Show details for FROG' });

    await user.click(screen.getByRole('button', { name: '5' }));
    expect(window.location.search).toBe('?minConvictionWallets=5');
    expect(screen.getByRole('region', { name: 'Smart-wallet filter' })).toHaveTextContent(
      'Showing tokens bought by ≥5 conviction wallets',
    );
    expect(screen.getByText('No mover passes the conviction-wallet filter right now')).toBeInTheDocument();
    expect(screen.getByText(/2 ranked tokens were not bought by enough conviction wallets/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '10+' }));
    expect(window.location.search).toBe('?minConvictionWallets=10');
  });

  it('refetches movers and safety checks when the threshold changes', async () => {
    const client = smartMovers();
    const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
    const { rerender } = render(
      <LiveFeedProvider client={client} connect={connect} minConvictionWallets={3}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await screen.findByRole('button', { name: 'Show details for FROG' });
    rerender(
      <LiveFeedProvider client={client} connect={connect} minConvictionWallets={10}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await waitFor(() =>
      expect(client.getMovers).toHaveBeenLastCalledWith(expect.objectContaining({ minConvictionWallets: 10 })),
    );
    expect(client.getScreenings).toHaveBeenLastCalledWith(expect.objectContaining({ minConvictionWallets: 10 }));
    // The stream is not reopened for a new threshold.
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('shows the server list unfiltered and explains it when the backend does not report conviction yet', async () => {
    renderApp(
      fakeClient({
        getMovers: vi.fn(async () => ({
          at: '2026-11-13T20:05:00.000Z',
          movers: [makeMover({ mint: MINT_A, symbol: 'FROG', smartWallets: { count: 6, elite: 1, holding: 1 } })],
        })),
      }),
    );
    expect(await screen.findByRole('button', { name: 'Show details for FROG' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Smart-wallet filter' })).toHaveTextContent(
      'conviction data not available yet',
    );
    expect(within(screen.getByRole('table')).getByText('6 good')).toBeInTheDocument();
  });

  it('adds a token once a smart-wallet event pushes it over the threshold', async () => {
    const app = renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Show details for FROG' });
    app.emit({
      type: 'smart-wallet',
      data: { mint: MINT_B, smartWallets: makeCounts({ count: 9, elite: 0, holding: 1, conviction: 3 }), wallet: makeSmartWallet() },
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
    // This backend predates trading styles: no style badges, and the section says so.
    expect(within(section).queryByText(/^Style at entry/)).not.toBeInTheDocument();
    expect(section).toHaveTextContent('Trading style not available yet');

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

  it('shows each wallet\'s style at entry and now, its holding behavior, and what conviction vs flipper means', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getTokenSmartWallets: vi.fn(async () => ({
        mint: MINT_A,
        smartWallets: [
          makeSmartWallet({
            styleAtEntry: 'conviction',
            record: makeWalletRecord({ style: 'mixed', medianHoldSeconds: 840, flipRate: 12 }),
          }),
          makeSmartWallet({
            address: WALLET_B,
            tierAtEntry: 'elite',
            styleAtEntry: 'flipper',
            stillHolding: false,
            soldSol: 2,
            record: makeWalletRecord({ address: WALLET_B, style: 'flipper', medianHoldSeconds: 40, flipRate: 82 }),
          }),
        ],
      })),
    });
    renderApp(client);
    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const section = await screen.findByRole('region', { name: 'Smart wallets' });

    expect(await within(section).findByText('1 conviction wallet')).toBeInTheDocument();
    expect(section).toHaveTextContent(
      '1 conviction wallet among 2 good-history wallets that bought this token (1 flipper, 1 elite at the time they bought), 1 still holds.',
    );
    expect(within(section).getByText('Style at entry: Conviction')).toBeInTheDocument();
    expect(within(section).getByText('Style now: Mixed')).toBeInTheDocument();
    expect(within(section).getByText('Style at entry: Flipper')).toBeInTheDocument();
    expect(within(section).getByText('Style now: Flipper')).toBeInTheDocument();
    expect(section).toHaveTextContent(
      'usually buys 4 s after launch, usually holds 14 min; sold within 2 min in 12% of its tokens.',
    );
    expect(section).toHaveTextContent('usually holds 40 s; sold within 2 min in 82% of its tokens.');
    const note = within(section).getByText(/Conviction vs flipper/).closest('p');
    expect(note).toHaveTextContent('flippers are shown here but never count');
    expect(note).toHaveTextContent('buying right after them usually means becoming their exit liquidity');
    expect(note).toHaveTextContent('at least 3');
  });

  it('says smart-wallet data is not available yet on an older backend', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient({ getTokenSmartWallets: vi.fn(async () => Promise.reject(notFound())) }));
    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const section = await screen.findByRole('region', { name: 'Smart wallets' });
    expect(await within(section).findByText(/Smart-wallet data not available yet/)).toBeInTheDocument();
  });
});
