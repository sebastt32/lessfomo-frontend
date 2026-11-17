import { describe, expect, it } from 'vitest';
import { initialLiveFeedState, liveFeedReducer, type LiveFeedAction } from './liveFeed';
import {
  initialSmartWalletFeedState,
  selectSmartWalletCounts,
  selectVisibleMovers,
  selectVisibleScreenings,
  smartWalletFeedReducer,
  type SmartWalletFeedState,
} from './smartWalletFeed';
import { makeCounts, makeMover, makeScreening, makeSmartWallet, MINT_A, MINT_B } from '../test/fixtures';

const T1 = '2026-11-13T20:05:00.000Z';

function run(...actions: LiveFeedAction[]) {
  return {
    feed: actions.reduce(liveFeedReducer, initialLiveFeedState),
    smart: actions.reduce(smartWalletFeedReducer, initialSmartWalletFeedState),
  };
}

const smartEvent = (mint: string, count: number): LiveFeedAction => ({
  type: 'stream/event',
  event: {
    type: 'smart-wallet',
    data: { mint, smartWallets: makeCounts({ count, elite: 0, holding: count }), wallet: makeSmartWallet() },
  },
});

describe('smart-wallet support', () => {
  it('is unknown until data arrives', () => {
    expect(initialSmartWalletFeedState.support).toBe('unknown');
  });

  it('is unavailable when a ranking arrives without smartWallets (backend predates it)', () => {
    const { smart } = run({ type: 'movers/loaded', payload: { at: T1, movers: [makeMover()] } });
    expect(smart.support).toBe('unavailable');
  });

  it('is available when movers carry smartWallets or a smart-wallet event arrives', () => {
    expect(
      run({ type: 'movers/loaded', payload: { at: T1, movers: [makeMover({ smartWallets: makeCounts() })] } }).smart
        .support,
    ).toBe('available');
    expect(run(smartEvent(MINT_A, 1)).smart.support).toBe('available');
  });

  it('stays unknown on an empty ranking', () => {
    expect(run({ type: 'movers/loaded', payload: { at: null, movers: [] } }).smart.support).toBe('unknown');
  });
});

describe('smart-wallet event', () => {
  it('updates the counts of a mover already in the ranking', () => {
    const { feed } = run(
      { type: 'movers/loaded', payload: { at: T1, movers: [makeMover({ smartWallets: makeCounts({ count: 1 }) })] } },
      smartEvent(MINT_A, 3),
    );
    expect(feed.movers.items[0]?.smartWallets).toEqual({ count: 3, elite: 0, holding: 3 });
  });

  it('leaves the live state untouched for tokens outside the ranking but remembers their counts', () => {
    const before = run({ type: 'movers/loaded', payload: { at: T1, movers: [makeMover()] } });
    const after = run({ type: 'movers/loaded', payload: { at: T1, movers: [makeMover()] } }, smartEvent(MINT_B, 2));
    expect(after.feed.movers).toEqual(before.feed.movers);
    expect(selectSmartWalletCounts(after.smart, MINT_B)).toEqual({ count: 2, elite: 0, holding: 2 });
  });
});

describe('threshold filtering', () => {
  const ranking: LiveFeedAction = {
    type: 'movers/loaded',
    payload: {
      at: T1,
      movers: [
        makeMover({ mint: MINT_A, smartWallets: makeCounts({ count: 0 }) }),
        makeMover({ mint: MINT_B, symbol: 'CAT', smartWallets: makeCounts({ count: 2 }) }),
      ],
    },
  };

  it('keeps only movers bought by at least minSmartWallets good wallets', () => {
    const { feed, smart } = run(ranking);
    expect(selectVisibleMovers(feed, smart, 1).items.map((m) => m.mint)).toEqual([MINT_B]);
    expect(selectVisibleMovers(feed, smart, 1)).toMatchObject({ filtered: true, hidden: 1 });
    expect(selectVisibleMovers(feed, smart, 3).items).toEqual([]);
  });

  it('adds a mover once a smart-wallet event pushes it over the threshold', () => {
    const { feed, smart } = run(ranking, smartEvent(MINT_A, 1));
    expect(selectVisibleMovers(feed, smart, 1).items.map((m) => m.mint)).toEqual([MINT_A, MINT_B]);
  });

  it('filters a momentum event client-side', () => {
    const { feed, smart } = run(ranking, {
      type: 'stream/event',
      event: {
        type: 'momentum',
        data: { at: T1, movers: [makeMover({ mint: MINT_A, smartWallets: makeCounts({ count: 0 }) })] },
      },
    });
    expect(selectVisibleMovers(feed, smart, 1).items).toEqual([]);
  });

  it('shows everything, unfiltered, when the backend has no smart-wallet data', () => {
    const { feed, smart } = run({ type: 'movers/loaded', payload: { at: T1, movers: [makeMover()] } });
    expect(selectVisibleMovers(feed, smart, 1)).toEqual({ items: feed.movers.items, filtered: false, hidden: 0 });
  });

  it('trusts screenings the server already filtered and filters live ones by known counts', () => {
    const state: SmartWalletFeedState = run(
      ranking,
      {
        type: 'screenings/loaded',
        payload: { screenings: [makeScreening({ mint: 'FromServer1111111111111111111111111111111' })] },
        minSmartWallets: 2,
      },
    ).smart;
    const feed = run(
      ranking,
      {
        type: 'screenings/loaded',
        payload: { screenings: [makeScreening({ mint: 'FromServer1111111111111111111111111111111' })] },
        minSmartWallets: 2,
      },
      { type: 'stream/event', event: { type: 'screening', data: makeScreening({ mint: MINT_A, evaluatedAt: T1 }) } },
      {
        type: 'stream/event',
        event: { type: 'screening', data: makeScreening({ mint: 'Unknown111111111111111111111111111111111', evaluatedAt: T1 }) },
      },
    ).feed;
    const mints = (min: number) => selectVisibleScreenings(feed, state, min).items.map((s) => s.mint);
    expect(mints(1)).toEqual(['FromServer1111111111111111111111111111111']);
    expect(mints(2)).toEqual(['FromServer1111111111111111111111111111111']);
    expect(mints(3)).toEqual([]);
  });
});
