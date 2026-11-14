import type {
  ApiErrorBody,
  HealthResponse,
  MoversResponse,
  ScreeningsResponse,
  TokenDetailResponse,
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
}

export interface ApiClient {
  readonly baseUrl: string;
  readonly streamUrl: string;
  getHealth(options?: RequestOptions): Promise<HealthResponse>;
  getMovers(options?: ListOptions): Promise<MoversResponse>;
  getScreenings(options?: ListOptions): Promise<ScreeningsResponse>;
  getToken(mint: string, options?: RequestOptions): Promise<TokenDetailResponse>;
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

function withLimit(path: string, limit: number | undefined): string {
  return limit === undefined ? path : `${path}?limit=${encodeURIComponent(String(limit))}`;
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
    getMovers: (options = {}) => request<MoversResponse>(withLimit('/api/movers', options.limit), options),
    getScreenings: (options = {}) =>
      request<ScreeningsResponse>(withLimit('/api/screenings', options.limit), options),
    getToken: (mint, options) => request<TokenDetailResponse>(`/api/tokens/${encodeURIComponent(mint)}`, options),
  };
}
