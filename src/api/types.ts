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
