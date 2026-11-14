import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isAbortError, type ApiClient } from '../api/client';
import { connectTokenStream, type ConnectionState, type StreamHandle, type TokenStreamOptions } from '../api/stream';
import type { Candle, CandleInterval, DevTrade } from '../api/types';
import { toFeedError } from '../state/errors';
import type { FeedError } from '../state/liveFeed';
import { initialTokenChartState, tokenChartReducer } from '../state/tokenChart';

export const CANDLE_LIMIT = 300;

export type ConnectTokenStreamFn = (options: TokenStreamOptions) => StreamHandle;

export interface UseTokenChartOptions {
  connect?: ConnectTokenStreamFn;
  limit?: number;
}

export interface TokenChartResult {
  status: 'loading' | 'ready' | 'error';
  /** Interval of `candles`; it can lag the requested interval while loading. */
  interval: CandleInterval;
  candles: readonly Candle[];
  devTrades: readonly DevTrade[];
  totalSupply: number;
  solUsd: number | null;
  error: FeedError | null;
  connection: ConnectionState;
  retry: () => void;
}

/**
 * Loads a token's candles for an interval and keeps them live through GET /api/tokens/:mint/stream.
 * The stream is per mint (an interval change only refetches); it closes on mint change and unmount.
 */
export function useTokenChart(
  client: ApiClient,
  mint: string,
  interval: CandleInterval,
  { connect = connectTokenStream, limit = CANDLE_LIMIT }: UseTokenChartOptions = {},
): TokenChartResult {
  const [state, dispatch] = useReducer(tokenChartReducer, initialTokenChartState);
  const inFlight = useRef<AbortController | null>(null);
  const nextRequestId = useRef(0);

  const load = useCallback(
    (background: boolean) => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      nextRequestId.current += 1;
      const requestId = nextRequestId.current;
      dispatch({ type: 'load/started', requestId, mint, interval, background });
      client.getCandles(mint, { interval, limit, signal: controller.signal }).then(
        (payload) => dispatch({ type: 'load/succeeded', requestId, payload }),
        (error: unknown) => {
          if (isAbortError(error) || controller.signal.aborted) return;
          dispatch({ type: 'load/failed', requestId, error: toFeedError(error) });
        },
      );
    },
    [client, mint, interval, limit],
  );

  // The stream effect must not depend on the interval, so it reaches the latest loader through a ref.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    load(false);
    return () => inFlight.current?.abort();
  }, [load]);

  useEffect(() => {
    let previous: ConnectionState = 'connecting';
    const handle = connect({
      url: client.tokenStreamUrl(mint),
      onEvent: (event) => {
        if (event.type === 'trade') dispatch({ type: 'trade', trade: event.data });
        else dispatch({ type: 'sol-price', solUsd: event.data.solUsd });
      },
      onConnectionChange: (next) => {
        dispatch({ type: 'connection/changed', state: next });
        // Trades missed while disconnected are only in the stored history: refetch it.
        if (next === 'connected' && (previous === 'reconnecting' || previous === 'offline')) loadRef.current(true);
        previous = next;
      },
    });
    return () => handle.close();
  }, [client, connect, mint]);

  const retry = useCallback(() => load(false), [load]);

  // Derive loading for a mint/interval the reducer has not started yet, instead of resetting in an effect.
  const current = state.mint === mint && state.interval === interval;
  return {
    status: current ? state.phase : 'loading',
    interval: state.interval,
    candles: current ? state.candles : [],
    devTrades: current ? state.devTrades : [],
    totalSupply: state.totalSupply,
    solUsd: state.solUsd,
    error: current ? state.error : null,
    connection: state.connection,
    retry,
  };
}
