import type { ConnectionState } from '../api/stream';
import type { Candle, CandleInterval, CandlesResponse, DevTrade, TradeView } from '../api/types';
import { applyTrade } from '../lib/candles';
import type { FeedError } from './liveFeed';

/** Live candle data of one token for one interval. */
export interface TokenChartState {
  mint: string | null;
  interval: CandleInterval;
  /** Identifies the in-flight request; stale responses are dropped. */
  requestId: number;
  phase: 'loading' | 'ready' | 'error';
  candles: Candle[];
  devTrades: DevTrade[];
  totalSupply: number;
  solUsd: number | null;
  error: FeedError | null;
  inFlight: boolean;
  /** Trades received while a request is in flight, replayed onto its snapshot. */
  pending: TradeView[];
  connection: ConnectionState;
}

export type TokenChartAction =
  | { type: 'load/started'; requestId: number; mint: string; interval: CandleInterval; background: boolean }
  | { type: 'load/succeeded'; requestId: number; payload: CandlesResponse }
  | { type: 'load/failed'; requestId: number; error: FeedError }
  | { type: 'trade'; trade: TradeView }
  | { type: 'sol-price'; solUsd: number }
  | { type: 'connection/changed'; state: ConnectionState };

export const initialTokenChartState: TokenChartState = {
  mint: null,
  interval: '1m',
  requestId: 0,
  phase: 'loading',
  candles: [],
  devTrades: [],
  totalSupply: 0,
  solUsd: null,
  error: null,
  inFlight: false,
  pending: [],
  connection: 'connecting',
};

function withTrade(candles: Candle[], devTrades: DevTrade[], trade: TradeView, interval: CandleInterval) {
  return {
    candles: applyTrade(candles, trade, interval),
    devTrades: trade.isDev ? [...devTrades, { time: trade.time, side: trade.side, solAmount: trade.solAmount }] : devTrades,
  };
}

export function tokenChartReducer(state: TokenChartState, action: TokenChartAction): TokenChartState {
  switch (action.type) {
    case 'load/started': {
      // A background refresh of the same series keeps the chart on screen.
      const keep = action.background && state.phase === 'ready' && state.mint === action.mint && state.interval === action.interval;
      return keep
        ? { ...state, requestId: action.requestId, inFlight: true, pending: [] }
        : {
            ...state,
            mint: action.mint,
            interval: action.interval,
            requestId: action.requestId,
            phase: 'loading',
            candles: [],
            devTrades: [],
            error: null,
            inFlight: true,
            pending: [],
          };
    }
    case 'load/succeeded': {
      if (action.requestId !== state.requestId) return state;
      const { payload } = action;
      let candles = payload.candles;
      let devTrades = payload.devTrades;
      for (const trade of state.pending) ({ candles, devTrades } = withTrade(candles, devTrades, trade, state.interval));
      return {
        ...state,
        phase: 'ready',
        candles,
        devTrades,
        totalSupply: payload.totalSupply,
        solUsd: payload.solUsd ?? state.solUsd,
        error: null,
        inFlight: false,
        pending: [],
      };
    }
    case 'load/failed':
      if (action.requestId !== state.requestId) return state;
      // Keep a visible chart after a failed background refresh.
      if (state.phase === 'ready') return { ...state, inFlight: false, pending: [] };
      return { ...state, phase: 'error', error: action.error, inFlight: false, pending: [] };
    case 'trade': {
      if (state.phase === 'error') return state;
      const pending = state.inFlight ? [...state.pending, action.trade] : state.pending;
      if (state.phase === 'loading') return { ...state, pending };
      return { ...state, pending, ...withTrade(state.candles, state.devTrades, action.trade, state.interval) };
    }
    case 'sol-price':
      return { ...state, solUsd: action.solUsd };
    case 'connection/changed':
      return { ...state, connection: action.state };
  }
}
