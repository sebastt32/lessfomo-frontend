import type {
  HealthResponse,
  Mover,
  MoversResponse,
  ScreeningView,
  ScreeningsResponse,
  Sources,
  StreamEvent,
} from '../api/types';
import type { ConnectionState } from '../api/stream';

export const MAX_SCREENINGS = 100;
export const MAX_SCORE_POINTS = 60;
export const MAX_CREATED_AT = 1000;

export type SectionStatus = 'loading' | 'ready' | 'error';

export interface FeedError {
  code: string;
  message: string;
}

export interface ScorePoint {
  at: string;
  score: number;
}

export interface LiveFeedState {
  connection: ConnectionState;
  health: { status: SectionStatus; startedAt: string | null; error: FeedError | null };
  /** null until /api/health answers or the first status event arrives. */
  sources: Sources | null;
  /** True when a status event arrived after the last reload started; newer than /api/health. */
  sourcesFromStream: boolean;
  movers: { status: SectionStatus; at: string | null; items: Mover[]; error: FeedError | null };
  screenings: { status: SectionStatus; items: ScreeningView[]; error: FeedError | null };
  /** Scores seen live per mint, oldest first. */
  scoreHistory: Record<string, ScorePoint[]>;
  /** Creation time (TokenView.detectedAt) per mint seen in token events or rankings, oldest entries dropped first. */
  createdAt: Record<string, string>;
  tokensDetected: number;
}

export type LiveFeedAction =
  | { type: 'health/loaded'; payload: HealthResponse }
  | { type: 'health/failed'; error: FeedError }
  /** `minConvictionWallets` is the conviction threshold the request was filtered with, if any. */
  | { type: 'movers/loaded'; payload: MoversResponse; minConvictionWallets?: number }
  | { type: 'movers/failed'; error: FeedError }
  | { type: 'screenings/loaded'; payload: ScreeningsResponse; minConvictionWallets?: number }
  | { type: 'screenings/failed'; error: FeedError }
  | { type: 'stream/event'; event: StreamEvent }
  | { type: 'connection/changed'; state: ConnectionState }
  | { type: 'reload/started' };

export const initialLiveFeedState: LiveFeedState = {
  connection: 'connecting',
  health: { status: 'loading', startedAt: null, error: null },
  sources: null,
  sourcesFromStream: false,
  movers: { status: 'loading', at: null, items: [], error: null },
  screenings: { status: 'loading', items: [], error: null },
  scoreHistory: {},
  createdAt: {},
  tokensDetected: 0,
};

const EMPTY_HISTORY: readonly ScorePoint[] = [];

export function selectScoreHistory(state: LiveFeedState, mint: string): readonly ScorePoint[] {
  return state.scoreHistory[mint] ?? EMPTY_HISTORY;
}

function screeningKey(screening: ScreeningView): string {
  return `${screening.mint}|${screening.evaluatedAt}`;
}

/** Concatenates lists in priority order, dropping duplicates and capping the length. */
function mergeScreenings(...lists: ScreeningView[][]): ScreeningView[] {
  const seen = new Set<string>();
  const merged: ScreeningView[] = [];
  for (const list of lists) {
    for (const screening of list) {
      const key = screeningKey(screening);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(screening);
      if (merged.length === MAX_SCREENINGS) return merged;
    }
  }
  return merged;
}

function isOlder(candidate: string | null, current: string | null): boolean {
  if (current === null) return false;
  if (candidate === null) return true;
  return Date.parse(candidate) < Date.parse(current);
}

function recordScores(
  history: Record<string, ScorePoint[]>,
  at: string | null,
  movers: Mover[],
): Record<string, ScorePoint[]> {
  if (at === null || movers.length === 0) return history;
  const next = { ...history };
  for (const mover of movers) {
    const points = next[mover.mint] ?? [];
    if (points.at(-1)?.at === at) continue;
    next[mover.mint] = [...points, { at, score: mover.score }].slice(-MAX_SCORE_POINTS);
  }
  return next;
}

function recordCreatedAt(
  createdAt: Record<string, string>,
  entries: readonly { mint: string; detectedAt: string }[],
): Record<string, string> {
  const fresh = entries.filter((entry) => createdAt[entry.mint] !== entry.detectedAt);
  if (fresh.length === 0) return createdAt;
  const next = { ...createdAt };
  for (const entry of fresh) {
    delete next[entry.mint];
    next[entry.mint] = entry.detectedAt;
  }
  const keys = Object.keys(next);
  if (keys.length <= MAX_CREATED_AT) return next;
  return Object.fromEntries(keys.slice(-MAX_CREATED_AT).map((mint) => [mint, next[mint]!]));
}

function applyRanking(state: LiveFeedState, at: string | null, movers: Mover[]): LiveFeedState {
  return {
    ...state,
    movers: { status: 'ready', at, items: movers, error: null },
    scoreHistory: recordScores(state.scoreHistory, at, movers),
    createdAt: recordCreatedAt(state.createdAt, movers),
  };
}

function applyStreamEvent(state: LiveFeedState, event: StreamEvent): LiveFeedState {
  switch (event.type) {
    case 'momentum':
      return applyRanking(state, event.data.at, event.data.movers);
    case 'screening': {
      const screening = event.data;
      const affectsMovers = state.movers.items.some((m) => m.mint === screening.mint);
      return {
        ...state,
        screenings: { ...state.screenings, items: mergeScreenings([screening], state.screenings.items) },
        movers: affectsMovers
          ? {
              ...state.movers,
              items: state.movers.items.map((m) =>
                m.mint === screening.mint ? { ...m, status: screening.status } : m,
              ),
            }
          : state.movers,
      };
    }
    case 'status':
      return { ...state, sources: event.data.sources, sourcesFromStream: true };
    case 'smart-wallet': {
      const { mint, smartWallets } = event.data;
      if (!state.movers.items.some((m) => m.mint === mint)) return state;
      return {
        ...state,
        movers: {
          ...state.movers,
          items: state.movers.items.map((m) => (m.mint === mint ? { ...m, smartWallets } : m)),
        },
      };
    }
    case 'token':
      return {
        ...state,
        tokensDetected: state.tokensDetected + 1,
        createdAt: recordCreatedAt(state.createdAt, [event.data]),
      };
  }
}

export function liveFeedReducer(state: LiveFeedState, action: LiveFeedAction): LiveFeedState {
  switch (action.type) {
    case 'health/loaded':
      return {
        ...state,
        health: { status: 'ready', startedAt: action.payload.startedAt, error: null },
        sources: state.sourcesFromStream ? state.sources : action.payload.sources,
      };
    case 'health/failed':
      return { ...state, health: { ...state.health, status: 'error', error: action.error } };
    case 'movers/loaded':
      if (isOlder(action.payload.at, state.movers.at)) {
        return { ...state, movers: { ...state.movers, status: 'ready', error: null } };
      }
      return applyRanking(state, action.payload.at, action.payload.movers);
    case 'movers/failed':
      return { ...state, movers: { ...state.movers, status: 'error', error: action.error } };
    case 'screenings/loaded':
      return {
        ...state,
        screenings: {
          status: 'ready',
          items: mergeScreenings(state.screenings.items, action.payload.screenings),
          error: null,
        },
      };
    case 'screenings/failed':
      return { ...state, screenings: { ...state.screenings, status: 'error', error: action.error } };
    case 'stream/event':
      return applyStreamEvent(state, action.event);
    case 'connection/changed':
      return state.connection === action.state ? state : { ...state, connection: action.state };
    case 'reload/started': {
      const reset = <S extends { status: SectionStatus; error: FeedError | null }>(section: S): S =>
        section.status === 'error' ? { ...section, status: 'loading', error: null } : section;
      return {
        ...state,
        sourcesFromStream: false,
        health: reset(state.health),
        movers: reset(state.movers),
        screenings: reset(state.screenings),
      };
    }
  }
}
