import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { ConnectionState, StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { DashboardPage } from './DashboardPage';
import { makeCandles, makeDetail, makeMover, makeScreening, MINT_A, MINT_B } from '../test/fixtures';

const networkError = () => new ApiError(0, 'NETWORK_ERROR', 'Could not reach the lessfomo API at http://api.test.');

function fakeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    baseUrl: 'http://api.test',
    streamUrl: 'http://api.test/api/stream',
    getHealth: vi.fn(async () => ({
      status: 'ok' as const,
      startedAt: '2026-11-13T20:00:00.000Z',
      sources: { pumpportal: 'connected' as const, solanaLogs: 'connecting' as const },
    })),
    getMovers: vi.fn(async () => ({ at: '2026-11-13T20:05:00.000Z', movers: [makeMover()] })),
    getScreenings: vi.fn(async () => ({ screenings: [makeScreening({ mint: MINT_B, symbol: 'CAT' })] })),
    getToken: vi.fn(async () => makeDetail()),
    getCandles: vi.fn(async () => makeCandles()),
    tokenStreamUrl: (mint: string) => `http://api.test/api/tokens/${mint}/stream`,
    ...overrides,
  };
}

function fakeConnect() {
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  return {
    connect,
    setState: (state: ConnectionState) => act(() => options?.onConnectionChange(state)),
    emit: (event: Parameters<StreamOptions['onEvent']>[0]) => act(() => options?.onEvent(event)),
  };
}

function renderPage(client: ApiClient, connect: ReturnType<typeof fakeConnect>['connect']) {
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <DashboardPage />
    </LiveFeedProvider>,
  );
}

describe('DashboardPage', () => {
  it('shows a friendly offline state when the backend is not running', async () => {
    const client = fakeClient({
      getHealth: vi.fn(async () => Promise.reject(networkError())),
      getMovers: vi.fn(async () => Promise.reject(networkError())),
      getScreenings: vi.fn(async () => Promise.reject(networkError())),
    });
    const stream = fakeConnect();
    renderPage(client, stream.connect);
    stream.setState('offline');

    expect(await screen.findByText('The screener API is not answering')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getAllByText('Could not reach the screener API')).toHaveLength(2);
    expect(screen.getByText(/does not make a token profitable/)).toBeInTheDocument();
  });

  it('renders the initial snapshot and replaces movers on a momentum event', async () => {
    const stream = fakeConnect();
    renderPage(fakeClient(), stream.connect);
    stream.setState('connected');

    expect(await screen.findByRole('button', { name: 'Show details for FROG' })).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    const sources = screen.getByLabelText('Data sources');
    expect(within(sources).getByText('PumpPortal')).toBeInTheDocument();
    expect(sources).toHaveTextContent('PumpPortalconnected');
    expect(sources).toHaveTextContent('Solana logsconnecting');

    stream.emit({
      type: 'momentum',
      data: { at: '2026-11-13T20:06:00.000Z', movers: [makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat' })] },
    });
    const table = screen.getByRole('table');
    expect(within(table).getByRole('button', { name: 'Show details for CAT' })).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Show details for FROG' })).not.toBeInTheDocument();
  });

  it('reloads the snapshot after the stream recovers from a drop', async () => {
    const client = fakeClient();
    const stream = fakeConnect();
    renderPage(client, stream.connect);
    await screen.findByRole('button', { name: 'Show details for FROG' });
    expect(client.getMovers).toHaveBeenCalledTimes(1);

    stream.setState('connected');
    stream.setState('reconnecting');
    stream.setState('connected');
    expect(client.getMovers).toHaveBeenCalledTimes(2);
    expect(client.getScreenings).toHaveBeenCalledTimes(2);
  });

  it('loads token detail when a row is selected', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderPage(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    expect(client.getToken).toHaveBeenCalledWith(MINT_A, expect.anything());
    const panel = await screen.findByRole('region', { name: 'FROG' });
    // Two stored readings plus the live score seen in the ranking (72 at 20:05).
    expect(
      within(panel).getByRole('img', { name: 'Momentum score over 3 readings, from 40 to 72 out of 100' }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Safety check history')).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('region', { name: 'FROG' })).not.toBeInTheDocument();
  });

  it('shows the live price chart above the safety history in the token detail', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderPage(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const panel = await screen.findByRole('region', { name: 'FROG' });
    const chart = await within(panel).findByRole('img', { name: 'Price of FROG in SOL, 1m candles, 2 candles' });
    expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '1m' }));

    const history = within(panel).getByText('Safety check history');
    expect(chart.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(within(panel).getByRole('button', { name: '5m' }));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '5m' }));
  });

  it('explains a token the API has never seen (404 TOKEN_NOT_FOUND)', async () => {
    const client = fakeClient({
      getToken: vi.fn(async () => Promise.reject(new ApiError(404, 'TOKEN_NOT_FOUND', 'Token was never seen'))),
    });
    const user = userEvent.setup();
    renderPage(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for CAT' }));
    expect(await screen.findByText("This token is not in the screener's history")).toBeInTheDocument();
  });
});
