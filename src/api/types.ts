/**
 * Types mirroring the lessfomo HTTP API contract (docs/API.md in the backend repo).
 * Keep these in sync with the backend; they are the single source of truth for the UI.
 */

export type SafetyStatus = 'pending' | 'passed' | 'failed' | 'unverified';

export interface TokenView {
  mint: string;
  symbol: string;
  name: string;
  creator: string;
  metadataUri: string;
  initialBuySol: number;
  marketCapSol: number;
  detectedAt: string;
}

export interface ScreeningView {
  mint: string;
  symbol: string;
  name: string;
  status: 'passed' | 'failed' | 'unverified';
  /** Only for "unverified". */
  reason: string | null;
  /** Empty unless "failed". */
  failureCodes: string[];
  top10Pct: number | null;
  creatorPct: number | null;
  totalHolders: number | null;
  evaluatedAt: string;
  /** Token creation time; older backends omit it. */
  detectedAt?: string | null;
}

export interface MomentumComponents {
  activity: number;
  acceleration: number;
  buyPressure: number;
}

export interface MomentumMetrics {
  uniqueBuyers1m: number;
  uniqueBuyers5m: number;
  avgUniqueBuyersPrevMinutes: number;
  buyVolumeSol5m: number;
  sellVolumeSol5m: number;
  tradeCount5m: number;
  medianBuySol5m: number;
  priceChange5mPct: number;
  lastPriceSol: number | null;
}

export interface Mover {
  mint: string;
  symbol: string;
  name: string;
  status: SafetyStatus;
  detectedAt: string;
  /** 0-100 */
  score: number;
  components: MomentumComponents;
  metrics: MomentumMetrics;
  /**
   * Required by the contract. Optional here because a backend that predates it does not send it yet;
   * the UI shows a dash until it arrives.
   */
  liquidity?: Liquidity;
}

export interface MomentumPoint {
  at: string;
  score: number;
  components: MomentumComponents;
  metrics: MomentumMetrics;
}

export type SourceStatus = 'connecting' | 'connected' | 'disconnected';

export interface Sources {
  pumpportal: SourceStatus;
  solanaLogs: SourceStatus;
}

// Endpoint responses

export interface HealthResponse {
  status: 'ok';
  startedAt: string;
  sources: Sources;
}

export interface MoversResponse {
  /** null until the first minute has passed. */
  at: string | null;
  movers: Mover[];
}

export interface ScreeningsResponse {
  screenings: ScreeningView[];
}

export interface TokenDetailResponse {
  token: TokenView;
  status: SafetyStatus;
  screenings: ScreeningView[];
  /** Oldest first. */
  momentum: MomentumPoint[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// SSE event payloads (GET /api/stream)

export interface MomentumEvent {
  at: string;
  movers: Mover[];
}

export interface StatusEvent {
  sources: Sources;
}

export type StreamEvent =
  | { type: 'token'; data: TokenView }
  | { type: 'screening'; data: ScreeningView }
  | { type: 'momentum'; data: MomentumEvent }
  | { type: 'status'; data: StatusEvent };

// Candles and per-token stream (GET /api/tokens/:mint/candles, GET /api/tokens/:mint/stream)

export type CandleInterval = '1s' | '1m' | '5m';

export interface Candle {
  /** Bucket start, Unix seconds (UTC). */
  time: number;
  /** Prices in SOL per token. */
  open: number;
  high: number;
  low: number;
  close: number;
  volumeSol: number;
  buyVolumeSol: number;
  sellVolumeSol: number;
  trades: number;
}

export interface DevTrade {
  /** Unix seconds. */
  time: number;
  side: 'buy' | 'sell';
  solAmount: number;
}

export interface TradeView {
  signature: string;
  trader: string;
  side: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
  /** The trader is the token creator. */
  isDev: boolean;
  /** Unix seconds. */
  time: number;
}

export interface CandlesResponse {
  mint: string;
  interval: CandleInterval;
  totalSupply: number;
  /** Latest SOL/USD price, or null when unavailable. */
  solUsd: number | null;
  /** Oldest first; buckets without trades are omitted. */
  candles: Candle[];
  devTrades: DevTrade[];
}

export interface SolPriceEvent {
  solUsd: number;
}

export type TokenStreamEvent = { type: 'trade'; data: TradeView } | { type: 'sol-price'; data: SolPriceEvent };

// History: liquidity, lifecycle, snapshots, token list and stats

/** Liquidity of the token's market. On the pump.fun bonding curve it is the real SOL in the curve. */
export interface Liquidity {
  /** null until a trade or pool reading is known. */
  sol: number | null;
  /** 0-100 progress of the pump.fun curve; 100 once migrated; null if unknown. */
  bondingCurvePct: number | null;
  /** true once the token moved to PumpSwap. */
  migrated: boolean;
}

/** dead = no trades for 24 hours. */
export type Lifecycle = 'active' | 'dead';

export type SnapshotMilestone =
  | '0m'
  | '1m'
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '12h'
  | '24h'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd7'
  | 'w2'
  | 'w3'
  | 'w4'
  | 'w5'
  | 'w6'
  | 'w7'
  | 'w8'
  | 'event:migrated'
  | 'event:new-peak'
  | 'event:holders-100'
  | 'event:holders-500'
  | 'event:holders-1000';

export interface TokenSnapshot {
  /** Weekly milestones continue past w8 (w9, w10, ...). */
  milestone: SnapshotMilestone | (string & {});
  /** ISO time the snapshot was taken. */
  at: string;
  priceSol: number | null;
  marketCapSol: number | null;
  /** Volume since the previous snapshot. */
  volumeSol: number | null;
  /** Since the previous snapshot. */
  buys: number | null;
  sells: number | null;
  /** Since the previous snapshot. */
  uniqueBuyers: number | null;
  holders: number | null;
  top10Pct: number | null;
  devHoldsPct: number | null;
  liquidity: Liquidity;
  source: 'trades' | 'dexscreener' | 'rugcheck' | 'mixed';
}

export interface TokenListItem {
  /** detectedAt is the token's creation date and time. */
  token: TokenView;
  status: SafetyStatus;
  lifecycle: Lifecycle;
  /** Latest known. */
  liquidity: Liquidity;
  lastPriceSol: number | null;
  lastMarketCapSol: number | null;
  peakMarketCapSol: number | null;
  /** Highest momentum score ever recorded. */
  maxScore: number | null;
  /** Latest known. */
  holders: number | null;
  lastTradeAt: string | null;
  snapshotCount: number;
}

export type TokenSortField = 'detectedAt' | 'maxScore' | 'peakMarketCapSol' | 'liquidity';

export type SortDirection = 'asc' | 'desc';

export interface TokenSort {
  field: TokenSortField;
  direction: SortDirection;
}

export interface TokenListResponse {
  tokens: TokenListItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface TokenSnapshotsResponse {
  mint: string;
  lifecycle: Lifecycle;
  /** Oldest first. */
  snapshots: TokenSnapshot[];
}

export interface StatsResponse {
  /** First token ever stored. */
  since: string;
  tokens: { total: number; active: number; dead: number; migrated: number };
  screenings: { passed: number; failed: number; unverified: number; pending: number };
  trades: number;
  snapshots: number;
}
