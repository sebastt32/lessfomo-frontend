import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError, type ApiClient } from '../api/client';
import { connectStream, type ConnectionState, type StreamHandle, type StreamOptions } from '../api/stream';
import { initialLiveFeedState, liveFeedReducer, type LiveFeedAction, type LiveFeedState } from '../state/liveFeed';
import {
  initialSmartWalletFeedState,
  smartWalletFeedReducer,
  type SmartWalletFeedState,
} from '../state/smartWalletFeed';
import { DEFAULT_MIN_SMART_WALLETS } from '../lib/smartWalletFilter';
import { toFeedError } from '../state/errors';

export const MOVERS_LIMIT = 20;
export const SCREENINGS_LIMIT = 50;

export type ConnectFn = (options: StreamOptions) => StreamHandle;

export interface UseLiveFeedOptions {
  client: ApiClient;
  connect?: ConnectFn;
  /** Threshold sent with the movers and safety-check requests; changing it reloads them. */
  minSmartWallets?: number;
}

export interface LiveFeed {
  state: LiveFeedState;
  smartWallets: SmartWalletFeedState;
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
  minSmartWallets = DEFAULT_MIN_SMART_WALLETS,
}: UseLiveFeedOptions): LiveFeed {
  const [state, dispatchFeed] = useReducer(liveFeedReducer, initialLiveFeedState);
  const [smartWallets, dispatchSmart] = useReducer(smartWalletFeedReducer, initialSmartWalletFeedState);
  const dispatch = useCallback((action: LiveFeedAction) => {
    dispatchFeed(action);
    dispatchSmart(action);
  }, []);
  const inFlight = useRef<AbortController | null>(null);
  // Read at request time so a new threshold reloads the lists without reopening the stream.
  const threshold = useRef(minSmartWallets);
  threshold.current = minSmartWallets;

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
      .getMovers({ limit: MOVERS_LIMIT, minSmartWallets: min, signal })
      .then((payload) => dispatch({ type: 'movers/loaded', payload, minSmartWallets: min }), fail('movers/failed'));
    client
      .getScreenings({ limit: SCREENINGS_LIMIT, minSmartWallets: min, signal })
      .then(
        (payload) => dispatch({ type: 'screenings/loaded', payload, minSmartWallets: min }),
        fail('screenings/failed'),
      );
  }, [client, dispatch]);

  // A new threshold refetches the lists; the first render already loads them below.
  const loadedWith = useRef(minSmartWallets);
  useEffect(() => {
    if (loadedWith.current === minSmartWallets) return;
    loadedWith.current = minSmartWallets;
    load();
  }, [minSmartWallets, load]);

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
    });
    return () => {
      handle.close();
      inFlight.current?.abort();
    };
  }, [client, connect, load, dispatch]);

  return { state, smartWallets, reload: load };
}
