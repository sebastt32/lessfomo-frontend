import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { ConnectionState, StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { AppShell } from './AppShell';
import { DashboardPage } from './DashboardPage';
import { fakeClient } from '../test/fakeClient';
import { makeMover, MINT_A, MINT_B } from '../test/fixtures';

const networkError = () => new ApiError(0, 'NETWORK_ERROR', 'Could not reach the lessfomo API at http://api.test.');

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

/** The live view inside the app shell, which owns the URL: selecting a token opens its own view (S1). */
function renderApp(client: ApiClient, connect: ReturnType<typeof fakeConnect>['connect']) {
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
}

afterEach(() => window.history.replaceState(null, '', '/'));

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

  // S1: the token detail used to open in a side panel of the live view; it is now a separate view with its own URL.
  it('opens the token in its own view when a row is selected, and comes back with Back', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    expect(window.location.search).toBe(`?view=token&mint=${MINT_A}`);
    expect(client.getToken).toHaveBeenCalledWith(MINT_A, expect.anything());
    expect(await screen.findByRole('heading', { level: 1, name: 'FROG' })).toBeInTheDocument();
    // The lists are gone: the token has the whole page.
    expect(screen.queryByRole('region', { name: 'Top movers' })).not.toBeInTheDocument();
    const view = screen.getByRole('article', { name: 'FROG' });
    // Two stored readings plus the live score seen in the ranking (72 at 20:05).
    expect(
      within(view).getByRole('img', { name: 'Momentum score over 3 readings, from 40 to 72 out of 100' }),
    ).toBeInTheDocument();
    expect(within(view).getByText('Safety check history')).toBeInTheDocument();

    await user.click(within(view).getByRole('link', { name: 'Back to Live' }));
    expect(window.location.search).toBe('');
    expect(screen.queryByRole('article', { name: 'FROG' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('shows the live price chart above the safety history in the token view', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    const view = await screen.findByRole('article', { name: 'FROG' });
    const chart = await within(view).findByRole('img', { name: 'Price of FROG in SOL, 1m candles, 2 candles' });
    expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '1m' }));

    const history = within(view).getByText('Safety check history');
    expect(chart.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(within(view).getByRole('button', { name: '5m' }));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '5m' }));
  });

  it('explains a token the API has never seen (404 TOKEN_NOT_FOUND), with a way back', async () => {
    const client = fakeClient({
      getToken: vi.fn(async () => Promise.reject(new ApiError(404, 'TOKEN_NOT_FOUND', 'Token was never seen'))),
    });
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Show details for CAT' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Token not found' })).toBeInTheDocument();
    expect(screen.getByText('This token is not available in lessfomo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to Live' }));
    expect(window.location.search).toBe('');
    expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });
});
