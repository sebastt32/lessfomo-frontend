import type {
  SmartWalletAnalysisResponse,
  SmartWalletCounts,
  SmartWalletInToken,
  WalletRecord,
  WalletResponse,
  WalletTokenResult,
  Candle,
  CandlesResponse,
  Liquidity,
  StatsResponse,
  TokenListItem,
  TokenSnapshot,
  MomentumPoint,
  Mover,
  ScreeningView,
  TokenDetailResponse,
  TokenView,
  TradeView,
} from '../api/types';

export const MINT_A = '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr';
export const MINT_B = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

export function makeMover(overrides: Partial<Mover> = {}): Mover {
  return {
    mint: MINT_A,
    symbol: 'FROG',
    name: 'Frog Coin',
    status: 'passed',
    detectedAt: '2026-11-13T20:00:00.000Z',
    score: 72.4,
    components: { activity: 0.8, acceleration: 0.6, buyPressure: 0.7 },
    metrics: {
      uniqueBuyers1m: 14,
      uniqueBuyers5m: 41,
      avgUniqueBuyersPrevMinutes: 5.5,
      buyVolumeSol5m: 12.3,
      sellVolumeSol5m: 4.1,
      tradeCount5m: 88,
      medianBuySol5m: 0.2,
      priceChange5mPct: 18.25,
      lastPriceSol: 0.0000321,
    },
    ...overrides,
  };
}

export function makeScreening(overrides: Partial<ScreeningView> = {}): ScreeningView {
  return {
    mint: MINT_A,
    symbol: 'FROG',
    name: 'Frog Coin',
    status: 'passed',
    reason: null,
    failureCodes: [],
    top10Pct: 22.5,
    creatorPct: 3.1,
    totalHolders: 154,
    evaluatedAt: '2026-11-13T20:01:00.000Z',
    ...overrides,
  };
}

export function makeToken(overrides: Partial<TokenView> = {}): TokenView {
  return {
    mint: MINT_A,
    symbol: 'FROG',
    name: 'Frog Coin',
    creator: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    metadataUri: 'https://example.test/frog.json',
    initialBuySol: 1.5,
    marketCapSol: 31.2,
    detectedAt: '2026-11-13T20:00:00.000Z',
    ...overrides,
  };
}

export function makePoint(at: string, score: number): MomentumPoint {
  const mover = makeMover({ score });
  return { at, score, components: mover.components, metrics: mover.metrics };
}

export function makeDetail(overrides: Partial<TokenDetailResponse> = {}): TokenDetailResponse {
  return {
    token: makeToken(),
    status: 'passed',
    screenings: [makeScreening()],
    momentum: [makePoint('2026-11-13T20:01:00.000Z', 40), makePoint('2026-11-13T20:02:00.000Z', 55)],
    ...overrides,
  };
}

/** A Unix time (seconds) that starts a 1s, 1m and 5m bucket. */
export const T0 = 1_763_064_000;

export function makeCandle(overrides: Partial<Candle> = {}): Candle {
  return {
    time: T0,
    open: 0.00000003,
    high: 0.00000004,
    low: 0.00000002,
    close: 0.000000035,
    volumeSol: 3,
    buyVolumeSol: 2,
    sellVolumeSol: 1,
    trades: 2,
    ...overrides,
  };
}

export function makeCandles(overrides: Partial<CandlesResponse> = {}): CandlesResponse {
  return {
    mint: MINT_A,
    interval: '1m',
    totalSupply: 1_000_000_000,
    solUsd: 140,
    candles: [
      makeCandle(),
      makeCandle({ time: T0 + 60, open: 0.000000035, close: 0.00000003, buyVolumeSol: 0.5, sellVolumeSol: 2 }),
    ],
    devTrades: [{ time: T0 + 10, side: 'buy', solAmount: 1 }],
    ...overrides,
  };
}

export function makeTrade(overrides: Partial<TradeView> = {}): TradeView {
  return {
    signature: 'sig',
    trader: 'wallet',
    side: 'buy',
    solAmount: 0.5,
    tokenAmount: 1000,
    priceSol: 0.00000004,
    isDev: false,
    time: T0 + 65,
    ...overrides,
  };
}

export function makeLiquidity(overrides: Partial<Liquidity> = {}): Liquidity {
  return { sol: 42.5, bondingCurvePct: 63.6, migrated: false, ...overrides };
}

export function makeListItem(overrides: Partial<TokenListItem> = {}): TokenListItem {
  return {
    token: makeToken({ detectedAt: '2026-11-13T20:00:00.000Z' }),
    status: 'passed',
    lifecycle: 'active',
    liquidity: makeLiquidity(),
    lastPriceSol: 0.0000321,
    lastMarketCapSol: 32.1,
    peakMarketCapSol: 1234.5,
    maxScore: 81.6,
    holders: 154,
    lastTradeAt: '2026-11-13T20:09:00.000Z',
    snapshotCount: 7,
    ...overrides,
  };
}

export function makeSnapshot(overrides: Partial<TokenSnapshot> = {}): TokenSnapshot {
  return {
    milestone: '0m',
    at: '2026-11-13T20:00:00.000Z',
    priceSol: 0.00000003,
    marketCapSol: 30,
    volumeSol: 1.5,
    buys: 3,
    sells: 1,
    uniqueBuyers: 3,
    holders: 4,
    top10Pct: 92.5,
    devHoldsPct: 6.2,
    liquidity: makeLiquidity({ sol: 1.5, bondingCurvePct: 2 }),
    source: 'trades',
    ...overrides,
  };
}

export function makeStats(overrides: Partial<StatsResponse> = {}): StatsResponse {
  return {
    since: '2026-11-01T03:15:03.912Z',
    tokens: { total: 1234, active: 210, dead: 1024, migrated: 3 },
    screenings: { passed: 80, failed: 900, unverified: 40, pending: 214 },
    trades: 456789,
    snapshots: 23456,
    ...overrides,
  };
}

export const WALLET_A = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
export const WALLET_B = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

export function makeCounts(overrides: Partial<SmartWalletCounts> = {}): SmartWalletCounts {
  return { count: 2, elite: 1, holding: 1, ...overrides };
}

export function makeWalletRecord(overrides: Partial<WalletRecord> = {}): WalletRecord {
  return {
    address: WALLET_A,
    tier: 'elite',
    isBot: false,
    tokens: 12,
    wins: 9,
    winRate: 75,
    netPnlSol: 14.236,
    avgPnlSol: 1.19,
    medianEntrySeconds: 4,
    lastActiveAt: '2026-11-13T19:58:00.000Z',
    updatedAt: '2026-11-13T20:00:00.000Z',
    ...overrides,
  };
}

export function makeSmartWallet(overrides: Partial<SmartWalletInToken> = {}): SmartWalletInToken {
  return {
    address: WALLET_A,
    tierAtEntry: 'good',
    record: makeWalletRecord(),
    firstBuyAt: '2026-11-13T20:00:03.000Z',
    entrySeconds: 3,
    boughtSol: 1.5,
    soldSol: 0,
    stillHolding: true,
    ...overrides,
  };
}

export function makeWalletResult(overrides: Partial<WalletTokenResult> = {}): WalletTokenResult {
  return {
    mint: MINT_B,
    symbol: 'CAT',
    name: 'Cat Coin',
    firstBuyAt: '2026-11-12T10:00:05.000Z',
    entrySeconds: 5,
    boughtSol: 1,
    soldSol: 2.5,
    pnlSol: 1.5,
    closedAt: '2026-11-12T11:00:00.000Z',
    ...overrides,
  };
}

export function makeWalletResponse(overrides: Partial<WalletResponse> = {}): WalletResponse {
  return { record: makeWalletRecord(), results: [makeWalletResult()], ...overrides };
}

export function makeAnalysis(overrides: Partial<SmartWalletAnalysisResponse> = {}): SmartWalletAnalysisResponse {
  const bucket = (smartWallets: string, tokens: number, reached2xPct: number, avg: number, median: number) => ({
    smartWallets,
    tokens,
    reached2xPct,
    migratedPct: 0.4,
    avgReturnPct: avg,
    medianReturnPct: median,
    winnersPct: 12.5,
    medianPeakX: 1.1,
  });
  return {
    from: '2026-11-09T00:00:00.000Z',
    to: '2026-11-16T00:00:00.000Z',
    costRoundTrip: 0.03,
    buckets: [
      bucket('2', 120, 9.3, 4.1, -1.5),
      bucket('0', 1234, 3.1, -4.2, -6),
      bucket('5+', 8, 25, 12.5, 3.2),
      bucket('1', 400, 6.2, -1, -3.5),
    ],
    ...overrides,
  };
}
