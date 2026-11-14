import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError, type ApiClient } from '../api/client';
import { connectStream, type ConnectionState, type StreamHandle, type StreamOptions } from '../api/stream';
import { initialLiveFeedState, liveFeedReducer, type LiveFeedState } from '../state/liveFeed';
import { toFeedError } from '../state/errors';

export const MOVERS_LIMIT = 20;
export const SCREENINGS_LIMIT = 50;

export type ConnectFn = (options: StreamOptions) => StreamHandle;

export interface UseLiveFeedOptions {
  client: ApiClient;
  connect?: ConnectFn;
}

export interface LiveFeed {
  state: LiveFeedState;
  /** Fetches health, movers and screenings again. */
  reload: () => void;
}

/**
 * Loads the initial REST snapshot, then keeps it current through the SSE stream.
 * After the stream recovers from a drop, the snapshot is fetched again to fill gaps.
 */
export function useLiveFeed({ client, connect = connectStream }: UseLiveFeedOptions): LiveFeed {
  const [state, dispatch] = useReducer(liveFeedReducer, initialLiveFeedState);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    const fail = (type: 'health/failed' | 'movers/failed' | 'screenings/failed') => (error: unknown) => {
      if (isAbortError(error) || signal.aborted) return;
      dispatch({ type, error: toFeedError(error) });
    };

    dispatch({ type: 'reload/started' });
    // Independent requests: start them together.
    client
      .getHealth({ signal })
      .then((payload) => dispatch({ type: 'health/loaded', payload }), fail('health/failed'));
    client
      .getMovers({ limit: MOVERS_LIMIT, signal })
      .then((payload) => dispatch({ type: 'movers/loaded', payload }), fail('movers/failed'));
    client
      .getScreenings({ limit: SCREENINGS_LIMIT, signal })
      .then((payload) => dispatch({ type: 'screenings/loaded', payload }), fail('screenings/failed'));
  }, [client]);

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
  }, [client, connect, load]);

  return { state, reload: load };
}
