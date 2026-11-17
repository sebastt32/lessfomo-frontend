import type {
  ApiErrorBody,
  CandleInterval,
  CandlesResponse,
  HealthResponse,
  Lifecycle,
  MoversResponse,
  SafetyStatus,
  ScreeningsResponse,
  SmartWalletAnalysisResponse,
  StatsResponse,
  TokenDetailResponse,
  TokenSmartWalletsResponse,
  WalletResponse,
  TokenListResponse,
  TokenSnapshotsResponse,
  TokenSort,
} from './types';

export const DEFAULT_API_URL = 'http://localhost:3001';

/** Normalizes a configured base URL; falls back to the backend's default address. */
export function resolveApiUrl(configured: string | undefined): string {
  const trimmed = configured?.trim() ?? '';
  return (trimmed === '' ? DEFAULT_API_URL : trimmed).replace(/\/+$/, '');
}

/** Error raised for every failed request. `status` is 0 when the API could not be reached. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface ListOptions extends RequestOptions {
  limit?: number;
  /** Only tokens bought by at least this many good-or-elite wallets. Still accepted by the API; the UI filters by conviction. */
  minSmartWallets?: number;
  /** Only tokens bought by at least this many conviction wallets (API default and minimum: the public minimum, 3). */
  minConvictionWallets?: number;
}

/** Date bounds for GET /api/analysis/smart-wallets; omitted fields use the API defaults. */
export interface AnalysisOptions extends RequestOptions {
  from?: string;
  to?: string;
  /** 'conviction' buckets tokens by conviction wallets at entry (`by=conviction`); the default sends nothing. */
  by?: 'smartWallets' | 'conviction';
}

export interface CandlesOptions extends RequestOptions {
  interval: CandleInterval;
  limit?: number;
}

/** Filters for GET /api/tokens. Omitted fields use the API defaults. */
export interface TokenListQuery {
  /** ISO date, inclusive, on detectedAt. */
  from?: string;
  /** ISO date, exclusive, on detectedAt. */
  to?: string;
  status?: readonly SafetyStatus[];
  lifecycle?: Lifecycle;
  /** Only tokens whose maxScore is at least this (0-100). */
  minScore?: number;
  /** Only tokens bought by at least this many good-or-elite wallets. */
  minSmartWallets?: number;
  /** Only tokens bought by at least this many conviction wallets. */
  minConvictionWallets?: number;
  /** Matches symbol, name or mint prefix. */
  q?: string;
  sort?: TokenSort;
  page?: number;
  pageSize?: number;
}

// Commas and colons are legal in a query value; keeping them literal makes `status=a,b` and `sort=f:dir` readable.
function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/gi, ',').replace(/%3A/gi, ':');
}

/** Query string for GET /api/tokens ('' when every field is the default), in the contract's param order. */
export function tokenListSearch(query: TokenListQuery): string {
  const params: [string, string][] = [];
  if (query.from) params.push(['from', query.from]);
  if (query.to) params.push(['to', query.to]);
  if (query.status && query.status.length > 0) params.push(['status', query.status.join(',')]);
  if (query.lifecycle) params.push(['lifecycle', query.lifecycle]);
  if (query.minScore !== undefined) params.push(['minScore', String(query.minScore)]);
  if (query.minSmartWallets !== undefined) params.push(['minSmartWallets', String(query.minSmartWallets)]);
  if (query.minConvictionWallets !== undefined) {
    params.push(['minConvictionWallets', String(query.minConvictionWallets)]);
  }
  const q = query.q?.trim();
  if (q) params.push(['q', q]);
  if (query.sort) params.push(['sort', `${query.sort.field}:${query.sort.direction}`]);
  if (query.page !== undefined) params.push(['page', String(query.page)]);
  if (query.pageSize !== undefined) params.push(['pageSize', String(query.pageSize)]);
  return toSearch(params);
}

function toSearch(params: readonly [string, string][]): string {
  if (params.length === 0) return '';
  return `?${params.map(([key, value]) => `${key}=${encodeQueryValue(value)}`).join('&')}`;
}

export interface ApiClient {
  readonly baseUrl: string;
  readonly streamUrl: string;
  getHealth(options?: RequestOptions): Promise<HealthResponse>;
  getMovers(options?: ListOptions): Promise<MoversResponse>;
  getScreenings(options?: ListOptions): Promise<ScreeningsResponse>;
  getToken(mint: string, options?: RequestOptions): Promise<TokenDetailResponse>;
  getCandles(mint: string, options: CandlesOptions): Promise<CandlesResponse>;
  /** GET /api/tokens: every token ever detected, paginated. */
  listTokens(query: TokenListQuery, options?: RequestOptions): Promise<TokenListResponse>;
  /** GET /api/tokens/:mint/snapshots, oldest first. */
  getTokenSnapshots(mint: string, options?: RequestOptions): Promise<TokenSnapshotsResponse>;
  /** GET /api/stats: database totals. */
  getStats(options?: RequestOptions): Promise<StatsResponse>;
  /** GET /api/tokens/:mint/smart-wallets: good-history wallets that bought the token. */
  getTokenSmartWallets(mint: string, options?: RequestOptions): Promise<TokenSmartWalletsResponse>;
  /** GET /api/wallets/:address: a wallet's record and its recent token results. */
  getWallet(address: string, options?: RequestOptions): Promise<WalletResponse>;
  /** GET /api/analysis/smart-wallets: success by number of good-history (or, with `by`, conviction) wallets. */
  getSmartWalletAnalysis(options?: AnalysisOptions): Promise<SmartWalletAnalysisResponse>;
  /** URL of GET /api/tokens/:mint/stream (relative when the base URL is empty). */
  tokenStreamUrl(mint: string): string;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface ApiClientConfig {
  baseUrl: string;
  fetchImpl?: FetchLike;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  );
}

function tokenPath(mint: string): string {
  return `/api/tokens/${encodeURIComponent(mint)}`;
}

function listPath(path: string, { limit, minSmartWallets, minConvictionWallets }: ListOptions): string {
  const params: [string, string][] = [];
  if (limit !== undefined) params.push(['limit', String(limit)]);
  if (minSmartWallets !== undefined) params.push(['minSmartWallets', String(minSmartWallets)]);
  if (minConvictionWallets !== undefined) params.push(['minConvictionWallets', String(minConvictionWallets)]);
  return `${path}${toSearch(params)}`;
}

export function createApiClient({ baseUrl, fetchImpl }: ApiClientConfig): ApiClient {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const init: RequestInit = { headers: { Accept: 'application/json' } };
    if (options.signal) init.signal = options.signal;

    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, init);
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new ApiError(0, 'NETWORK_ERROR', `Could not reach the lessfomo API at ${baseUrl}.`);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }

    if (!response.ok) {
      if (isApiErrorBody(body)) {
        throw new ApiError(response.status, body.error.code, body.error.message);
      }
      throw new ApiError(response.status, 'HTTP_ERROR', `The API answered with HTTP ${response.status}.`);
    }
    if (body === undefined) {
      throw new ApiError(response.status, 'INVALID_RESPONSE', 'The API answered with something that is not JSON.');
    }
    return body as T;
  }

  return {
    baseUrl,
    streamUrl: `${baseUrl}/api/stream`,
    getHealth: (options) => request<HealthResponse>('/api/health', options),
    getMovers: (options = {}) => request<MoversResponse>(listPath('/api/movers', options), options),
    getScreenings: (options = {}) => request<ScreeningsResponse>(listPath('/api/screenings', options), options),
    getToken: (mint, options) => request<TokenDetailResponse>(tokenPath(mint), options),
    getCandles: (mint, options) => {
      const query = new URLSearchParams({ interval: options.interval });
      if (options.limit !== undefined) query.set('limit', String(options.limit));
      return request<CandlesResponse>(`${tokenPath(mint)}/candles?${query.toString()}`, options);
    },
    listTokens: (query, options) => request<TokenListResponse>(`/api/tokens${tokenListSearch(query)}`, options),
    getTokenSnapshots: (mint, options) => request<TokenSnapshotsResponse>(`${tokenPath(mint)}/snapshots`, options),
    getStats: (options) => request<StatsResponse>('/api/stats', options),
    getTokenSmartWallets: (mint, options) =>
      request<TokenSmartWalletsResponse>(`${tokenPath(mint)}/smart-wallets`, options),
    getWallet: (address, options) => request<WalletResponse>(`/api/wallets/${encodeURIComponent(address)}`, options),
    getSmartWalletAnalysis: (options = {}) => {
      const params: [string, string][] = [];
      if (options.from) params.push(['from', options.from]);
      if (options.to) params.push(['to', options.to]);
      if (options.by === 'conviction') params.push(['by', 'conviction']);
      return request<SmartWalletAnalysisResponse>(`/api/analysis/smart-wallets${toSearch(params)}`, options);
    },
    tokenStreamUrl: (mint) => `${baseUrl}${tokenPath(mint)}/stream`,
  };
}
