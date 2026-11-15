import { describe, expect, it } from 'vitest';
import {
  initialLiveFeedState,
  MAX_CREATED_AT,
  liveFeedReducer,
  MAX_SCORE_POINTS,
  MAX_SCREENINGS,
  selectScoreHistory,
  type LiveFeedAction,
  type LiveFeedState,
} from './liveFeed';
import { makeMover, makeScreening, makeToken, MINT_A, MINT_B } from '../test/fixtures';

const T1 = '2026-11-13T20:05:00.000Z';
const T2 = '2026-11-13T20:06:00.000Z';

function run(...actions: LiveFeedAction[]): LiveFeedState {
  return actions.reduce(liveFeedReducer, initialLiveFeedState);
}

describe('initial state', () => {
  it('starts loading every section while connecting', () => {
    expect(initialLiveFeedState).toEqual({
      connection: 'connecting',
      health: { status: 'loading', startedAt: null, error: null },
      sources: null,
      sourcesFromStream: false,
      movers: { status: 'loading', at: null, items: [], error: null },
      screenings: { status: 'loading', items: [], error: null },
      scoreHistory: {},
      createdAt: {},
      tokensDetected: 0,
    });
  });
});

describe('health and sources', () => {
  it('stores startedAt and source statuses from GET /api/health', () => {
    const state = run({
      type: 'health/loaded',
      payload: { status: 'ok', startedAt: T1, sources: { pumpportal: 'connected', solanaLogs: 'connecting' } },
    });
    expect(state.health).toEqual({ status: 'ready', startedAt: T1, error: null });
    expect(state.sources).toEqual({ pumpportal: 'connected', solanaLogs: 'connecting' });
  });

  it('replaces source statuses on a status event', () => {
    const state = run(
      {
        type: 'health/loaded',
        payload: { status: 'ok', startedAt: T1, sources: { pumpportal: 'connected', solanaLogs: 'connected' } },
      },
      {
        type: 'stream/event',
        event: { type: 'status', data: { sources: { pumpportal: 'disconnected', solanaLogs: 'connected' } } },
      },
    );
    expect(state.sources).toEqual({ pumpportal: 'disconnected', solanaLogs: 'connected' });
  });

  it('keeps sources from a status event that arrived while /api/health was in flight', () => {
    const state = run(
      { type: 'reload/started' },
      { type: 'stream/event', event: { type: 'status', data: { sources: { pumpportal: 'connected', solanaLogs: 'connected' } } } },
      {
        type: 'health/loaded',
        payload: { status: 'ok', startedAt: T1, sources: { pumpportal: 'connected', solanaLogs: 'connecting' } },
      },
    );
    expect(state.sources).toEqual({ pumpportal: 'connected', solanaLogs: 'connected' });
    expect(state.health.startedAt).toBe(T1);
  });

  it('uses /api/health sources again after a new reload starts', () => {
    const state = run(
      { type: 'stream/event', event: { type: 'status', data: { sources: { pumpportal: 'connected', solanaLogs: 'connected' } } } },
      { type: 'reload/started' },
      {
        type: 'health/loaded',
        payload: { status: 'ok', startedAt: T1, sources: { pumpportal: 'disconnected', solanaLogs: 'connected' } },
      },
    );
    expect(state.sources).toEqual({ pumpportal: 'disconnected', solanaLogs: 'connected' });
  });

  it('marks health as failed without touching known sources', () => {
    const state = run(
      { type: 'stream/event', event: { type: 'status', data: { sources: { pumpportal: 'connected', solanaLogs: 'connected' } } } },
      { type: 'health/failed', error: { code: 'NETWORK_ERROR', message: 'down' } },
    );
    expect(state.health).toEqual({ status: 'error', startedAt: null, error: { code: 'NETWORK_ERROR', message: 'down' } });
    expect(state.sources).toEqual({ pumpportal: 'connected', solanaLogs: 'connected' });
  });
});

describe('movers', () => {
  it('loads the initial ranking from GET /api/movers', () => {
    const mover = makeMover();
    const state = run({ type: 'movers/loaded', payload: { at: T1, movers: [mover] } });
    expect(state.movers).toEqual({ status: 'ready', at: T1, items: [mover], error: null });
  });

  it('replaces the ranking on every momentum event', () => {
    const first = makeMover({ mint: MINT_A });
    const second = makeMover({ mint: MINT_B, symbol: 'CAT' });
    const state = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [first] } },
      { type: 'stream/event', event: { type: 'momentum', data: { at: T2, movers: [second] } } },
    );
    expect(state.movers).toEqual({ status: 'ready', at: T2, items: [second], error: null });
  });

  it('ignores a REST response older than the live ranking it already has', () => {
    const live = makeMover({ mint: MINT_B });
    const state = run(
      { type: 'stream/event', event: { type: 'momentum', data: { at: T2, movers: [live] } } },
      { type: 'movers/loaded', payload: { at: T1, movers: [makeMover()] } },
      { type: 'movers/loaded', payload: { at: null, movers: [] } },
    );
    expect(state.movers.items).toEqual([live]);
    expect(state.movers.at).toBe(T2);
  });

  it('clears a previous error when a momentum event arrives', () => {
    const state = run(
      { type: 'movers/failed', error: { code: 'NETWORK_ERROR', message: 'down' } },
      { type: 'stream/event', event: { type: 'momentum', data: { at: T1, movers: [] } } },
    );
    expect(state.movers).toEqual({ status: 'ready', at: T1, items: [], error: null });
  });

  it('keeps already loaded movers when a later reload fails', () => {
    const mover = makeMover();
    const state = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [mover] } },
      { type: 'movers/failed', error: { code: 'HTTP_ERROR', message: 'boom' } },
    );
    expect(state.movers).toEqual({
      status: 'error',
      at: T1,
      items: [mover],
      error: { code: 'HTTP_ERROR', message: 'boom' },
    });
  });
});

describe('screenings', () => {
  it('loads the initial feed from GET /api/screenings', () => {
    const items = [makeScreening({ mint: MINT_B }), makeScreening()];
    const state = run({ type: 'screenings/loaded', payload: { screenings: items } });
    expect(state.screenings).toEqual({ status: 'ready', items, error: null });
  });

  it('prepends screening events, newest first', () => {
    const older = makeScreening({ evaluatedAt: T1 });
    const newer = makeScreening({ mint: MINT_B, evaluatedAt: T2, status: 'failed', failureCodes: ['TOP10_TOO_HIGH'] });
    const state = run(
      { type: 'screenings/loaded', payload: { screenings: [older] } },
      { type: 'stream/event', event: { type: 'screening', data: newer } },
    );
    expect(state.screenings.items).toEqual([newer, older]);
  });

  it(`keeps at most ${MAX_SCREENINGS} screenings`, () => {
    const loaded = Array.from({ length: MAX_SCREENINGS }, (_, i) =>
      makeScreening({ mint: `mint-${i}`, evaluatedAt: T1 }),
    );
    const live = makeScreening({ mint: 'live', evaluatedAt: T2 });
    const state = run(
      { type: 'screenings/loaded', payload: { screenings: loaded } },
      { type: 'stream/event', event: { type: 'screening', data: live } },
    );
    expect(state.screenings.items).toHaveLength(MAX_SCREENINGS);
    expect(state.screenings.items[0]).toEqual(live);
    expect(state.screenings.items.at(-1)?.mint).toBe(`mint-${MAX_SCREENINGS - 2}`);
  });

  it('does not duplicate a screening received twice', () => {
    const screening = makeScreening({ evaluatedAt: T1 });
    const state = run(
      { type: 'stream/event', event: { type: 'screening', data: screening } },
      { type: 'stream/event', event: { type: 'screening', data: screening } },
    );
    expect(state.screenings.items).toEqual([screening]);
  });

  it('keeps live screenings received before the initial load and drops duplicates', () => {
    const live = makeScreening({ mint: MINT_B, evaluatedAt: T2 });
    const historic = makeScreening({ evaluatedAt: T1 });
    const state = run(
      { type: 'stream/event', event: { type: 'screening', data: live } },
      { type: 'screenings/loaded', payload: { screenings: [live, historic] } },
    );
    expect(state.screenings).toEqual({ status: 'ready', items: [live, historic], error: null });
  });

  it('updates the safety status of the matching mover', () => {
    const state = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [makeMover({ status: 'pending' }), makeMover({ mint: MINT_B, status: 'pending' })] } },
      { type: 'stream/event', event: { type: 'screening', data: makeScreening({ status: 'failed', failureCodes: ['CREATOR_HOLDS_TOO_MUCH'] }) } },
    );
    expect(state.movers.items.map((m) => [m.mint, m.status])).toEqual([
      [MINT_A, 'failed'],
      [MINT_B, 'pending'],
    ]);
  });

  it('records a failed initial load', () => {
    const state = run({ type: 'screenings/failed', error: { code: 'NETWORK_ERROR', message: 'down' } });
    expect(state.screenings).toEqual({ status: 'error', items: [], error: { code: 'NETWORK_ERROR', message: 'down' } });
  });
});

describe('score history', () => {
  it('records one point per mover per ranking minute', () => {
    const state = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [makeMover({ score: 40 })] } },
      { type: 'stream/event', event: { type: 'momentum', data: { at: T1, movers: [makeMover({ score: 40 })] } } },
      { type: 'stream/event', event: { type: 'momentum', data: { at: T2, movers: [makeMover({ score: 60 })] } } },
    );
    expect(selectScoreHistory(state, MINT_A)).toEqual([
      { at: T1, score: 40 },
      { at: T2, score: 60 },
    ]);
    expect(selectScoreHistory(state, MINT_B)).toEqual([]);
  });

  it('does not record points for a ranking without a timestamp', () => {
    const state = run({ type: 'movers/loaded', payload: { at: null, movers: [makeMover()] } });
    expect(state.scoreHistory).toEqual({});
  });

  it(`keeps at most ${MAX_SCORE_POINTS} points per mint`, () => {
    const actions: LiveFeedAction[] = Array.from({ length: MAX_SCORE_POINTS + 5 }, (_, i) => ({
      type: 'stream/event',
      event: {
        type: 'momentum',
        data: { at: new Date(Date.UTC(2026, 10, 13, 20, i)).toISOString(), movers: [makeMover({ score: i })] },
      },
    }));
    const history = selectScoreHistory(run(...actions), MINT_A);
    expect(history).toHaveLength(MAX_SCORE_POINTS);
    expect(history[0]?.score).toBe(5);
  });
});

describe('connection and tokens', () => {
  it('tracks the SSE connection state', () => {
    expect(run({ type: 'connection/changed', state: 'reconnecting' }).connection).toBe('reconnecting');
  });

  it('counts tokens detected since the page opened', () => {
    const state = run(
      { type: 'stream/event', event: { type: 'token', data: makeToken() } },
      { type: 'stream/event', event: { type: 'token', data: makeToken({ mint: MINT_B }) } },
    );
    expect(state.tokensDetected).toBe(2);
  });

  it('remembers creation times from token events and rankings, so other sections can show them', () => {
    const state = run(
      { type: 'stream/event', event: { type: 'token', data: makeToken({ detectedAt: T1 }) } },
      { type: 'movers/loaded', payload: { at: T2, movers: [makeMover({ mint: MINT_B, detectedAt: T2 })] } },
    );
    expect(state.createdAt).toEqual({ [MINT_A]: T1, [MINT_B]: T2 });
  });

  it('caps the creation time lookup, dropping the oldest entries', () => {
    const tokens = Array.from({ length: MAX_CREATED_AT + 5 }, (_, i) =>
      makeToken({ mint: `mint-${i}`, detectedAt: T1 }),
    );
    const state = run(...tokens.map((data) => ({ type: 'stream/event' as const, event: { type: 'token' as const, data } })));
    expect(Object.keys(state.createdAt)).toHaveLength(MAX_CREATED_AT);
    expect(state.createdAt['mint-0']).toBeUndefined();
    expect(state.createdAt[`mint-${MAX_CREATED_AT + 4}`]).toBe(T1);
  });

  it('puts failed sections back into loading when a reload starts, keeping their data', () => {
    const mover = makeMover();
    const state = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [mover] } },
      { type: 'movers/failed', error: { code: 'NETWORK_ERROR', message: 'down' } },
      { type: 'health/failed', error: { code: 'NETWORK_ERROR', message: 'down' } },
      { type: 'screenings/loaded', payload: { screenings: [] } },
      { type: 'reload/started' },
    );
    expect(state.movers).toEqual({ status: 'loading', at: T1, items: [mover], error: null });
    expect(state.health.status).toBe('loading');
    expect(state.screenings.status).toBe('ready');
  });
});
