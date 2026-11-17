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
  /** Good-or-elite wallets that bought it. Optional: a backend that predates smart wallets does not send it. */
  smartWallets?: SmartWalletCounts;
  /** Stable → explosion → crash cycle. Optional: a backend that predates cycles does not send it. */
  cycle?: TokenCycle | null;
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
  /** Optional: a backend that predates cycles does not send it. */
  cycle?: TokenCycle | null;
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

/** A good-or-elite wallet bought or fully sold a token. */
export interface SmartWalletEvent {
  mint: string;
  smartWallets: SmartWalletCounts;
  wallet: SmartWalletInToken;
}

export type StreamEvent =
  | { type: 'token'; data: TokenView }
  | { type: 'screening'; data: ScreeningView }
  | { type: 'momentum'; data: MomentumEvent }
  | { type: 'status'; data: StatusEvent }
  | { type: 'smart-wallet'; data: SmartWalletEvent }
  | { type: 'cycle'; data: CycleEvent };

// Candles and per-token stream (GET /api/tokens/:mint/candles, GET /api/tokens/:mint/stream)

export type CandleInterval = '1s' | '1m' | '5m' | '15m' | '1h';

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

export type TokenStreamEvent =
  | { type: 'trade'; data: TradeView }
  | { type: 'sol-price'; data: SolPriceEvent }
  | { type: 'cycle'; data: CycleEvent };

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
  /** Optional: a backend that predates smart wallets does not send it. */
  smartWallets?: SmartWalletCounts;
  /** Stable → explosion → crash cycle. Optional: a backend that predates cycles does not send it. */
  cycle?: TokenCycle | null;
}

/** `smartWallets` and `convictionWallets` only sort descending. */
export type TokenSortField =
  | 'detectedAt'
  | 'appearedAt'
  | 'investWindow'
  | 'maxScore'
  | 'peakMarketCapSol'
  | 'liquidity'
  | 'smartWallets'
  | 'convictionWallets';

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

// Smart wallets: wallets with a good point-in-time trading history

export type WalletTier = 'elite' | 'good' | 'none';

/** Good-or-elite wallets (by tier at entry) that bought a token; `holding` = still holding. */
export interface SmartWalletCounts {
  count: number;
  elite: number;
  holding: number;
  /**
   * Of those, how many had the conviction style at entry. Optional: a backend that predates trading
   * styles does not send it; the UI then does not filter by it and says why.
   */
  conviction?: number;
}

/**
 * How a wallet usually trades (point-in-time, from the same prior results as its tier). A "flip" is a token
 * it sold within 120 s of its first buy. conviction: flip rate ≤ 30%; flipper: ≥ 60%; unrated: tier none.
 */
export type WalletStyle = 'conviction' | 'flipper' | 'mixed' | 'unrated';

export interface WalletRecord {
  address: string;
  /** Current tier, from closed results in the last 7 days. */
  tier: WalletTier;
  /** Trades at least 20 distinct tokens per hour on average. */
  isBot: boolean;
  /** Closed tokens in the last 7 days. */
  tokens: number;
  /** Closed tokens with a positive result. */
  wins: number;
  /** 0-100 */
  winRate: number;
  /** Sum of closed results, last 7 days. */
  netPnlSol: number;
  avgPnlSol: number;
  /** Seconds from token creation to its first buy. */
  medianEntrySeconds: number | null;
  /** Current style (last 7 days). Optional: older backends do not send the style fields. */
  style?: WalletStyle;
  /** 0-100, share of closed tokens sold within 120 s; null when no closed tokens. */
  flipRate?: number | null;
  /** First buy to first sell; tokens never sold before close are excluded. */
  medianHoldSeconds?: number | null;
  lastActiveAt: string | null;
  updatedAt: string;
}

export interface WalletTokenResult {
  mint: string;
  symbol: string;
  name: string;
  firstBuyAt: string;
  /** Seconds after the token's creation. */
  entrySeconds: number;
  boughtSol: number;
  soldSol: number;
  pnlSol: number;
  closedAt: string;
}

export interface SmartWalletInToken {
  address: string;
  /** Point-in-time tier when it first bought this token. */
  tierAtEntry: WalletTier;
  /** Point-in-time style when it first bought this token. Optional: older backends do not send it. */
  styleAtEntry?: WalletStyle;
  /** Current record, to explain why it is good. */
  record: WalletRecord;
  firstBuyAt: string;
  entrySeconds: number;
  boughtSol: number;
  soldSol: number;
  /** Positive balance per observed trades. */
  stillHolding: boolean;
}

export interface TokenSmartWalletsResponse {
  mint: string;
  /** Elite first, then by entrySeconds. */
  smartWallets: SmartWalletInToken[];
}

export interface WalletResponse {
  record: WalletRecord;
  /** Newest first, last 7 days, max 200. */
  results: WalletTokenResult[];
}

export interface SmartWalletBucket {
  /** "0", "1", "2", "3", "4" or "5+": the bucket key when grouped by good-history wallets. */
  smartWallets?: string;
  /** The bucket key when grouped by conviction wallets at entry (`by=conviction`). */
  convictionWallets?: string;
  tokens: number;
  /** Statistics are null for a bucket with no tokens. */
  reached2xPct: number | null;
  migratedPct: number | null;
  avgReturnPct: number | null;
  medianReturnPct: number | null;
  winnersPct: number | null;
  medianPeakX: number | null;
}

export interface SmartWalletAnalysisResponse {
  from: string;
  to: string;
  /** Fraction, e.g. 0.03 for 3%. */
  costRoundTrip: number;
  /** Grouping echoed by the backend; older backends omit it (always good-history wallets). */
  by?: 'smartWallets' | 'conviction';
  buckets: SmartWalletBucket[];
}

/** The signed-in user (see "Authentication" in the API contract). */
export interface SessionUser {
  username: string;
  role: 'superadmin';
}

/** Body of POST /api/auth/login and GET /api/auth/me. */
export interface SessionResponse {
  user: SessionUser;
}

// Token cycle: stable after appearing, explosion, peak, crash (see "Token cycle" in the API contract)

/** stable: not yet 2× base; exploding: reached 2× base; crashed: fell to ≤ 50% of its peak. */
export type CyclePhase = 'stable' | 'exploding' | 'crashed';

/** Everything is derived from trades seen so far, never from later data. */
export interface TokenCycle {
  /** When the token became public in lessfomo (not its creation). */
  appearedAt: string;
  /** First trade seen. */
  launchPriceSol: number | null;
  /** Base price: last trade at or before appearedAt. */
  appearedPriceSol: number | null;
  /** appearedPriceSol / launchPriceSol. */
  riseBeforeAppearanceX: number | null;
  /** Before appearing, the price had already reached 2× its launch price. */
  appearedLate: boolean;
  phase: CyclePhase;
  /** Last trade before the explosion with price ≤ 1.2× base (appearedAt if none). */
  runStartAt: string | null;
  /** First trade with price ≥ 2× base. */
  explosionAt: string | null;
  /**
   * runStartAt − appearedAt (≥ 0) once exploded; negative when appearedLate (seconds between the earlier 2×
   * and appearing); null while stable and not late.
   */
  investWindowSeconds: number | null;
  /** Maximum after the explosion. */
  peakAt: string | null;
  /** Peak price / base price. */
  peakX: number | null;
  /** First trade with price ≤ 50% of the peak, after the peak. */
  crashAt: string | null;
  /** 0-100, deepest fall from the peak so far. */
  maxDrawdownPct: number | null;
  /** Last price / base price. */
  lastPriceX: number | null;
  updatedAt: string;
}

/** `cycle` event on GET /api/stream and GET /api/tokens/:mint/stream. */
export interface CycleEvent {
  mint: string;
  cycle: TokenCycle;
}

export interface CycleWindowBucket {
  /** "late", "<1m", "1-5m", "5-15m", "15-60m" or ">1h". */
  label: string;
  tokens: number;
  medianPeakX: number | null;
}

/** GET /api/analysis/cycles: aggregates over tokens that appeared in the range. Statistics are null without tokens. */
export interface CyclesAnalysisResponse {
  from: string;
  to: string;
  tokens: number;
  /** Shares are 0-100. */
  appearedInTimePct: number | null;
  appearedLatePct: number | null;
  explodedPct: number | null;
  neverExplodedPct: number | null;
  crashedPct: number | null;
  medianInvestWindowSeconds: number | null;
  medianPeakX: number | null;
  medianSecondsToPeak: number | null;
  medianSecondsPeakToCrash: number | null;
  windowBuckets: CycleWindowBucket[];
}
