import { describe, expect, it } from 'vitest';
import type { LiveFeedAction } from './liveFeed';
import { cycleFeedReducer, initialCycleFeedState, MAX_TRACKED_CYCLES, selectCycle, type CycleFeedState } from './cycleFeed';
import { makeCycle, makeMover, makeStableCycle, MINT_A, MINT_B } from '../test/fixtures';

const AT = '2026-11-13T20:05:00.000Z';

function run(...actions: LiveFeedAction[]): CycleFeedState {
  return actions.reduce(cycleFeedReducer, initialCycleFeedState);
}

describe('cycleFeedReducer', () => {
  it('learns cycles from the ranking and says the backend supports them', () => {
    const cycle = makeStableCycle();
    const state = run({ type: 'movers/loaded', payload: { at: AT, movers: [makeMover({ cycle })] } });
    expect(state.support).toBe('available');
    expect(selectCycle(state, MINT_A)).toBe(cycle);
    expect(selectCycle(state, MINT_B)).toBeNull();
  });

  it('applies cycle events from the live stream', () => {
    const cycle = makeCycle();
    const state = run(
      { type: 'movers/loaded', payload: { at: AT, movers: [makeMover({ cycle: makeStableCycle() })] } },
      { type: 'stream/event', event: { type: 'cycle', data: { mint: MINT_A, cycle } } },
      { type: 'stream/event', event: { type: 'cycle', data: { mint: MINT_B, cycle: makeStableCycle() } } },
    );
    expect(selectCycle(state, MINT_A)).toBe(cycle);
    expect(selectCycle(state, MINT_B)?.phase).toBe('stable');
  });

  it('never replaces a cycle with an older reading', () => {
    const newer = makeCycle();
    const state = run(
      { type: 'stream/event', event: { type: 'cycle', data: { mint: MINT_A, cycle: newer } } },
      // The next minute's ranking still carries the cycle as it was before the event.
      {
        type: 'stream/event',
        event: { type: 'momentum', data: { at: AT, movers: [makeMover({ cycle: makeStableCycle() })] } },
      },
    );
    expect(selectCycle(state, MINT_A)).toBe(newer);
    // A row's own cycle wins when it is the newer one.
    const own = makeCycle({ updatedAt: '2026-11-13T20:20:00.000Z' });
    expect(selectCycle(state, MINT_A, own)).toBe(own);
    expect(selectCycle(state, MINT_A, makeStableCycle())).toBe(newer);
  });

  it('marks an older backend (rankings without the cycle field) as unavailable', () => {
    const state = run({ type: 'movers/loaded', payload: { at: AT, movers: [makeMover()] } });
    expect(state.support).toBe('unavailable');
    expect(selectCycle(state, MINT_A)).toBeNull();
    // A backend that sends `cycle: null` knows about cycles; this token simply has none yet.
    expect(run({ type: 'movers/loaded', payload: { at: AT, movers: [makeMover({ cycle: null })] } }).support).toBe(
      'available',
    );
    expect(run({ type: 'movers/loaded', payload: { at: AT, movers: [] } }).support).toBe('unknown');
  });

  it('ignores malformed cycle events and unrelated actions', () => {
    const state = run(
      { type: 'stream/event', event: { type: 'cycle', data: { mint: MINT_A } as never } },
      { type: 'reload/started' },
    );
    expect(state).toBe(initialCycleFeedState);
  });

  it('caps the tracked mints, dropping the oldest first', () => {
    let state = initialCycleFeedState;
    for (let i = 0; i <= MAX_TRACKED_CYCLES; i += 1) {
      state = cycleFeedReducer(state, {
        type: 'stream/event',
        event: { type: 'cycle', data: { mint: `mint-${i}`, cycle: makeStableCycle() } },
      });
    }
    expect(Object.keys(state.cycles)).toHaveLength(MAX_TRACKED_CYCLES);
    expect(selectCycle(state, 'mint-0')).toBeNull();
    expect(selectCycle(state, `mint-${MAX_TRACKED_CYCLES}`)).not.toBeNull();
  });
});
