import type { MomentumPoint, Mover, ScreeningView, TokenDetailResponse, TokenView } from '../api/types';

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
