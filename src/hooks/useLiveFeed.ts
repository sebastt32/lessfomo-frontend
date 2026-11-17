import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError, type ApiClient } from '../api/client';
import { connectStream, type ConnectionState, type StreamHandle, type StreamOptions } from '../api/stream';
import { initialLiveFeedState, liveFeedReducer, type LiveFeedAction, type LiveFeedState } from '../state/liveFeed';
import {
  initialSmartWalletFeedState,
  smartWalletFeedReducer,
  type SmartWalletFeedState,
} from '../state/smartWalletFeed';
import { cycleFeedReducer, initialCycleFeedState, type CycleFeedState } from '../state/cycleFeed';
import { DEFAULT_MIN_CONVICTION_WALLETS } from '../lib/smartWalletFilter';
import { toFeedError } from '../state/errors';

export const MOVERS_LIMIT = 20;
export const SCREENINGS_LIMIT = 50;

export type ConnectFn = (options: StreamOptions) => StreamHandle;

export interface UseLiveFeedOptions {
  client: ApiClient;
  connect?: ConnectFn;
  /** Conviction-wallet threshold sent with the movers and safety-check requests; changing it reloads them. */
  minConvictionWallets?: number;
}

export interface LiveFeed {
  state: LiveFeedState;
  smartWallets: SmartWalletFeedState;
  /** Token cycles seen in rankings and `cycle` events, and whether the backend reports them. */
  cycles: CycleFeedState;
  /** Fetches health, movers and screenings again. */
  reload: () => void;
}

/**
 * Loads the initial REST snapshot, then keeps it current through the SSE stream.
 * After the stream recovers from a drop, the snapshot is fetched again to fill gaps.
 */
export function useLiveFeed({
  client,
  connect = connectStream,
  minConvictionWallets = DEFAULT_MIN_CONVICTION_WALLETS,
}: UseLiveFeedOptions): LiveFeed {
  const [state, dispatchFeed] = useReducer(liveFeedReducer, initialLiveFeedState);
  const [smartWallets, dispatchSmart] = useReducer(smartWalletFeedReducer, initialSmartWalletFeedState);
  const [cycles, dispatchCycles] = useReducer(cycleFeedReducer, initialCycleFeedState);
  const dispatch = useCallback((action: LiveFeedAction) => {
    dispatchFeed(action);
    dispatchSmart(action);
    dispatchCycles(action);
  }, []);
  const inFlight = useRef<AbortController | null>(null);
  // Read at request time so a new threshold reloads the lists without reopening the stream.
  const threshold = useRef(minConvictionWallets);
  threshold.current = minConvictionWallets;

  const load = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    const fail = (type: 'health/failed' | 'movers/failed' | 'screenings/failed') => (error: unknown) => {
      if (isAbortError(error) || signal.aborted) return;
      dispatch({ type, error: toFeedError(error) });
    };

    const min = threshold.current;
    dispatch({ type: 'reload/started' });
    // Independent requests: start them together.
    client
      .getHealth({ signal })
      .then((payload) => dispatch({ type: 'health/loaded', payload }), fail('health/failed'));
    client
      .getMovers({ limit: MOVERS_LIMIT, minConvictionWallets: min, signal })
      .then((payload) => dispatch({ type: 'movers/loaded', payload, minConvictionWallets: min }), fail('movers/failed'));
    client
      .getScreenings({ limit: SCREENINGS_LIMIT, minConvictionWallets: min, signal })
      .then(
        (payload) => dispatch({ type: 'screenings/loaded', payload, minConvictionWallets: min }),
        fail('screenings/failed'),
      );
  }, [client, dispatch]);

  // A new threshold refetches the lists; the first render already loads them below.
  const loadedWith = useRef(minConvictionWallets);
  useEffect(() => {
    if (loadedWith.current === minConvictionWallets) return;
    loadedWith.current = minConvictionWallets;
    load();
  }, [minConvictionWallets, load]);

  useEffect(() => {
    load();
    let previous: ConnectionState = 'connecting';
    const handle = connect({
      url: client.streamUrl,
      onEvent: (event) => dispatch({ type: 'stream/event', event }),
      onConnectionChange: (next) => {
        dispatch({ type: 'connection/changed', state: next });
        if (next === 'connected' && (previous === 'reconnecting' || previous === 'offline')) load();
        previous = next;
      },
      // EventSource hides the HTTP status: ask the API, so an expired session (401) is noticed.
      onRejected: () => void client.getSession().catch(() => {}),
    });
    return () => {
      handle.close();
      inFlight.current?.abort();
    };
  }, [client, connect, load, dispatch]);

  return { state, smartWallets, cycles, reload: load };
}
