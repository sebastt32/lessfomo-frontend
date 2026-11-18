import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeBackend, PASSWORD, USERNAME } from '../test/fakeBackend';
import { fakeClient } from '../test/fakeClient';
import {
  isoAt,
  makeCandleCycle,
  makeCandles,
  makeDetail,
  makeMinuteCandles,
  makeMover,
  makeStableCycle,
  makeToken,
  MINT_A,
  MINT_B,
  T0,
} from '../test/fixtures';
import { lastChart } from '../test/lightweightChartsFake';
import { AppShell } from './AppShell';
import { AuthenticatedApp } from './AuthenticatedApp';

/** Stands in for the browser's EventSource, which the token view's own stream uses. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();

  constructor(
    readonly url: string,
    readonly init?: { withCredentials?: boolean },
  ) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) listener(new MessageEvent(type, { data: JSON.stringify(data) }));
  }
}

const tokenStream = (mint: string) =>
  FakeEventSource.instances.find((source) => source.url.endsWith(`/api/tokens/${mint}/stream`) && !source.closed);

function renderApp(client: ApiClient, url = '/') {
  window.history.replaceState(null, '', url);
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
  return { emit: (event: Parameters<StreamOptions['onEvent']>[0]) => act(() => options?.onEvent(event)) };
}

/** A token created at T0 whose cycle and candles share one clock, so its marks land on the chart. */
function cycleClient(overrides: Partial<ApiClient> = {}) {
  return fakeClient({
    getToken: vi.fn(async () => makeDetail({ token: makeToken({ detectedAt: isoAt(T0) }), cycle: makeCandleCycle() })),
    getCandles: vi.fn(async () =>
      makeCandles({ candles: makeMinuteCandles(...Array.from({ length: 16 }, (_, m) => m)), devTrades: [] }),
    ),
    ...overrides,
  });
}

const tokenHeading = (name: string) => screen.findByRole('heading', { level: 1, name });

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('token view: navigation', () => {
  it('opens from the top movers as a separate full-width view with its own URL', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient());

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    expect(window.location.search).toBe(`?view=token&mint=${MINT_A}`);
    expect(await tokenHeading('FROG')).toHaveFocus();
    expect(screen.getByText('Frog Coin')).toBeInTheDocument();
    // No side panel: the lists are not on this page, and no view is marked as current.
    expect(screen.queryByRole('region', { name: 'Top movers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Latest safety checks' })).not.toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Views' });
    expect(within(nav).queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to the token' })).toHaveAttribute('href', '#token');
  });

  it('opens from the safety feed', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client);

    const feed = await screen.findByRole('region', { name: 'Latest safety checks' });
    await user.click(await within(feed).findByRole('button', { name: 'Show details for CAT' }));
    expect(window.location.search).toBe(`?view=token&mint=${MINT_B}`);
    expect(client.getToken).toHaveBeenCalledWith(MINT_B, expect.anything());
    expect(await screen.findByRole('article')).toBeInTheDocument();
  });

  it('opens from the daily record and Back returns to the same day', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    const record = '?view=record&day=2026-11-16&minConvictionWallets=5';
    renderApp(client, `/${record}`);

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    // The token's URL keeps only the conviction filter, which applies to every view.
    expect(window.location.search).toBe(`?view=token&mint=${MINT_A}&minConvictionWallets=5`);
    await tokenHeading('FROG');
    expect(screen.queryByRole('region', { name: /Daily record/ })).not.toBeInTheDocument();

    const back = screen.getByRole('link', { name: 'Back to Daily record' });
    expect(back).toHaveAttribute('href', record);
    await user.click(back);
    expect(window.location.search).toBe(record);
    expect(await screen.findByRole('region', { name: 'Daily record · November 16, 2026' })).toBeInTheDocument();
  });

  it('returns to the list with the browser Back button too', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient(), '/?view=record&day=2026-11-15');

    await user.click(await screen.findByRole('button', { name: 'Show details for FROG' }));
    await tokenHeading('FROG');
    window.history.back();
    await waitFor(() => expect(window.location.search).toBe('?view=record&day=2026-11-15'));
    expect(await screen.findByRole('region', { name: /Daily record/ })).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    // And forward again shows the token, still remembering where it came from.
    window.history.forward();
    await waitFor(() => expect(window.location.search).toBe(`?view=token&mint=${MINT_A}`));
    expect(await screen.findByRole('link', { name: 'Back to Daily record' })).toHaveAttribute(
      'href',
      '?view=record&day=2026-11-15',
    );
  });

  it('shows the token when its URL is opened directly, with a way back to the live view', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client, `/?view=token&mint=${MINT_A}&minConvictionWallets=10`);

    expect(await tokenHeading('FROG')).toBeInTheDocument();
    expect(client.getToken).toHaveBeenCalledWith(MINT_A, expect.anything());
    const back = screen.getByRole('link', { name: 'Back to Live' });
    expect(back).toHaveAttribute('href', '?minConvictionWallets=10');
    await user.click(back);
    expect(window.location.search).toBe('?minConvictionWallets=10');
    expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('shows the token after signing in when its URL was opened signed out', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    backend.state.intercept = (call) =>
      call.path === `/api/tokens/${MINT_A}` && backend.state.signedIn
        ? new Response(JSON.stringify(makeDetail()), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : undefined;
    window.history.replaceState(null, '', `/?view=token&mint=${MINT_A}`);
    render(<AuthenticatedApp client={backend.client} connect={backend.connect} />);

    // Signed out: only the login form; nothing of the token is fetched or shown.
    await screen.findByRole('form', { name: 'Sign in' });
    expect(backend.dataCalls()).toEqual([]);
    expect(FakeEventSource.instances).toEqual([]);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Username'), USERNAME);
    await user.type(screen.getByLabelText('Password'), `${PASSWORD}{Enter}`);
    expect(await tokenHeading('FROG')).toBeInTheDocument();
    expect(window.location.search).toBe(`?view=token&mint=${MINT_A}`);
  });

  it('explains a token that is unknown or not public, with a way back', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getToken: vi.fn(async () => Promise.reject(new ApiError(404, 'TOKEN_NOT_FOUND', 'Token was never seen'))),
    });
    renderApp(client, `/?view=token&mint=${MINT_B}`);

    expect(await tokenHeading('Token not found')).toBeInTheDocument();
    expect(screen.getByText('This token is not available in lessfomo')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Live' })).toBeInTheDocument();
    // Nothing else is shown for it: no chart, no cycle.
    expect(screen.queryByRole('region', { name: 'Cycle' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to Live' }));
    expect(await screen.findByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('treats an address that is not a mint as not found', async () => {
    const client = fakeClient({
      getToken: vi.fn(async () => Promise.reject(new ApiError(400, 'INVALID_MINT', 'Mint is not a base58 address'))),
    });
    renderApp(client, '/?view=token&mint=not-a-mint');
    expect(await tokenHeading('Token not found')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers a retry when the token cannot be loaded', async () => {
    const user = userEvent.setup();
    const getToken = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error'))
      .mockResolvedValue(makeDetail());
    renderApp(fakeClient({ getToken }), `/?view=token&mint=${MINT_A}`);

    expect(await screen.findByText('Could not load this token')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Live' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await tokenHeading('FROG')).toBeInTheDocument();
  });

  it('loads another token from scratch when the URL changes to it', async () => {
    const client = fakeClient({
      getToken: vi.fn(async (mint: string) =>
        makeDetail({ token: makeToken({ mint, symbol: mint === MINT_A ? 'FROG' : 'CAT' }) }),
      ),
    });
    renderApp(client, `/?view=token&mint=${MINT_A}`);
    await tokenHeading('FROG');
    await waitFor(() => expect(tokenStream(MINT_A)).toBeDefined());
    const first = tokenStream(MINT_A)!;

    act(() => {
      window.history.pushState(null, '', `/?view=token&mint=${MINT_B}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await tokenHeading('CAT')).toBeInTheDocument();
    expect(first.closed).toBe(true);
    await waitFor(() => expect(tokenStream(MINT_B)).toBeDefined());
  });
});

describe('token view: chart and cycle', () => {
  it('shows the large chart with the cycle marked on it, and the cycle in plain language beside it', async () => {
    const client = cycleClient();
    renderApp(client, `/?view=token&mint=${MINT_A}`);
    await tokenHeading('FROG');

    await screen.findByRole('img', { name: 'Price of FROG in SOL, 1m candles, 16 candles' });
    // Enough candles to reach back to the creation of a token tracked for 24 hours.
    expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '1m', limit: 1500 }));
    expect(lastChart().candles().markers.map((marker) => [marker.time, marker.text])).toEqual([
      [T0, 'Created'],
      [T0 + 120, 'Appeared'],
      [T0 + 480, 'Run-up'],
      [T0 + 540, 'Explosion'],
      [T0 + 720, 'Peak'],
      [T0 + 900, 'Crash'],
    ]);
    expect(lastChart().candles().priceLines).toEqual([expect.objectContaining({ price: 0.00000003, title: 'Base price' })]);
    const shade = document.querySelector<HTMLElement>('.candlestick-chart__shade')!;
    expect(shade).not.toHaveAttribute('hidden');
    expect(shade.style.width).toBe('70px');

    const summary = screen.getByRole('region', { name: 'Cycle' });
    expect(within(summary).getByText('Crashed')).toBeInTheDocument();
    expect(summary).toHaveTextContent('Could be bought for 6 min 20 s before the run-up');
    expect(summary).toHaveTextContent('Peak3.20× the base price');
    expect(summary).toHaveTextContent('nothing here predicts what the price does next');

    // The marks are also text, with their times.
    const legend = screen.getByRole('heading', { name: 'Marks on the chart' }).parentElement!;
    expect(legend).toHaveTextContent('Appeared in lessfomo');
    expect(legend).toHaveTextContent('Shaded: invest window');

    // The existing sections are still there, under the chart.
    const details = screen.getByRole('region', { name: 'Token details' });
    expect(within(details).getByText('Safety check history')).toBeInTheDocument();
    expect(within(details).getByRole('region', { name: 'Smart wallets' })).toBeInTheDocument();
  });

  it('offers the 15m and 1h intervals and loads them', async () => {
    const user = userEvent.setup();
    const client = cycleClient();
    renderApp(client, `/?view=token&mint=${MINT_A}`);
    const group = await screen.findByRole('group', { name: 'Candle interval' });

    await user.click(within(group).getByRole('button', { name: '15m' }));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '15m' }));
    await user.click(within(group).getByRole('button', { name: '1h' }));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '1h' }));
  });

  it('applies cycle events from the token stream as they happen', async () => {
    const stable = makeStableCycle({ appearedAt: isoAt(T0 + 120), updatedAt: isoAt(T0 + 120) });
    const client = cycleClient({
      getToken: vi.fn(async () => makeDetail({ token: makeToken({ detectedAt: isoAt(T0) }), cycle: stable })),
    });
    renderApp(client, `/?view=token&mint=${MINT_A}`);
    await tokenHeading('FROG');
    const summary = screen.getByRole('region', { name: 'Cycle' });
    expect(within(summary).getByText('Stable')).toBeInTheDocument();
    expect(summary).toHaveTextContent(/Still stable: .+ since it appeared/);
    await screen.findByRole('img', { name: /Price of FROG/ });
    expect(lastChart().candles().markers.map((marker) => marker.text)).toEqual(['Created', 'Appeared']);

    await waitFor(() => expect(tokenStream(MINT_A)).toBeDefined());
    expect(tokenStream(MINT_A)!.init).toEqual({ withCredentials: true });
    const exploding = makeCandleCycle({ phase: 'exploding', crashAt: null, updatedAt: isoAt(T0 + 720) });
    act(() => tokenStream(MINT_A)!.emit('cycle', { mint: MINT_A, cycle: exploding }));

    expect(within(summary).getByText('Exploding')).toBeInTheDocument();
    expect(summary).toHaveTextContent('Could be bought for 6 min 20 s before the run-up');
    expect(lastChart().candles().markers.map((marker) => marker.text)).toEqual([
      'Created',
      'Appeared',
      'Run-up',
      'Explosion',
      'Peak',
    ]);

    // An older reading arriving late does not undo it.
    act(() => tokenStream(MINT_A)!.emit('cycle', { mint: MINT_A, cycle: stable }));
    expect(within(summary).getByText('Exploding')).toBeInTheDocument();
  });

  it('applies cycle events from the live stream too', async () => {
    const stable = makeStableCycle({ appearedAt: isoAt(T0 + 120), updatedAt: isoAt(T0 + 120) });
    const client = cycleClient({
      getToken: vi.fn(async () => makeDetail({ token: makeToken({ detectedAt: isoAt(T0) }), cycle: stable })),
    });
    const { emit } = renderApp(client, `/?view=token&mint=${MINT_A}`);
    await tokenHeading('FROG');
    const summary = screen.getByRole('region', { name: 'Cycle' });
    expect(within(summary).getByText('Stable')).toBeInTheDocument();

    emit({ type: 'cycle', data: { mint: MINT_A, cycle: makeCandleCycle() } });
    expect(within(summary).getByText('Crashed')).toBeInTheDocument();
    // Another token's cycle changes nothing here.
    emit({ type: 'cycle', data: { mint: MINT_B, cycle: stable } });
    expect(within(summary).getByText('Crashed')).toBeInTheDocument();
  });
});

describe('token view: backend without cycles', () => {
  it('keeps the chart and the existing sections, and says cycle data is not available yet', async () => {
    const user = userEvent.setup();
    // makeDetail and makeMover have no `cycle` field, like a backend that predates cycles.
    const client = fakeClient();
    renderApp(client);

    const movers = await screen.findByRole('region', { name: 'Top movers' });
    expect(await within(movers).findByTitle('Cycle data not available yet')).toHaveTextContent('—');

    await user.click(within(movers).getByRole('button', { name: 'Show details for FROG' }));
    await tokenHeading('FROG');
    expect(screen.getByRole('region', { name: 'Cycle' })).toHaveTextContent('Cycle data not available yet');
    expect(await screen.findByRole('img', { name: 'Price of FROG in SOL, 1m candles, 2 candles' })).toBeInTheDocument();
    expect(lastChart().candles().priceLines).toEqual([]);
    expect(document.querySelector('.candlestick-chart__shade')).toHaveAttribute('hidden');
    const details = screen.getByRole('region', { name: 'Token details' });
    expect(within(details).getByText('Safety check history')).toBeInTheDocument();
    expect(
      within(details).getByRole('img', { name: 'Momentum score over 3 readings, from 40 to 72 out of 100' }),
    ).toBeInTheDocument();
  });

  it('shows the cycle of a mover from the ranking and from live cycle events', async () => {
    const stable = makeStableCycle();
    const client = fakeClient({
      getMovers: vi.fn(async () => ({ at: '2026-11-13T20:05:00.000Z', movers: [makeMover({ cycle: stable })] })),
    });
    const { emit } = renderApp(client);
    const movers = await screen.findByRole('region', { name: 'Top movers' });
    expect(await within(movers).findByText('Stable')).toBeInTheDocument();

    emit({
      type: 'cycle',
      data: { mint: MINT_A, cycle: { ...stable, phase: 'exploding', investWindowSeconds: 95, updatedAt: '2026-11-13T20:06:00.000Z' } },
    });
    expect(within(movers).getByText('Exploding')).toBeInTheDocument();
    expect(within(movers).getByText('1m 35s window')).toBeInTheDocument();
  });
});
