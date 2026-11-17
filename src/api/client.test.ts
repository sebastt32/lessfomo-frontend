import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, DEFAULT_API_URL, resolveApiUrl, tokenListSearch, type FetchLike } from './client';
import type { CandlesResponse, HealthResponse, MoversResponse, ScreeningsResponse, TokenDetailResponse } from './types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const MINT = '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr';

describe('resolveApiUrl', () => {
  it('defaults to http://localhost:3001', () => {
    expect(DEFAULT_API_URL).toBe('http://localhost:3001');
    expect(resolveApiUrl(undefined)).toBe('http://localhost:3001');
    expect(resolveApiUrl('   ')).toBe('http://localhost:3001');
  });

  it('strips trailing slashes from a configured URL', () => {
    expect(resolveApiUrl('http://example.test:9000//')).toBe('http://example.test:9000');
  });

  it('resolves "/" to same-origin relative requests, as used behind the nginx proxy', async () => {
    const baseUrl = resolveApiUrl('/');
    const fetchImpl = vi.fn<FetchLike>(async () => new Response(JSON.stringify({ screenings: [] }), { status: 200 }));

    await createApiClient({ baseUrl, fetchImpl }).getScreenings();

    expect(baseUrl).toBe('');
    expect(fetchImpl.mock.calls[0]?.[0]).toMatch(/^\/api\/screenings/);
  });
});

describe('createApiClient', () => {
  it('GETs /api/health and returns the parsed body', async () => {
    const body: HealthResponse = {
      status: 'ok',
      startedAt: '2026-11-13T20:00:00.000Z',
      sources: { pumpportal: 'connected', solanaLogs: 'connecting' },
    };
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(body));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getHealth()).resolves.toEqual(body);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/health',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  it('passes limit as a query parameter for movers and screenings', async () => {
    const movers: MoversResponse = { at: null, movers: [] };
    const screenings: ScreeningsResponse = { screenings: [] };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(movers))
      .mockResolvedValueOnce(jsonResponse(screenings));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getMovers({ limit: 20 })).resolves.toEqual(movers);
    await expect(client.getScreenings({ limit: 50 })).resolves.toEqual(screenings);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/movers?limit=20');
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('http://api.test/api/screenings?limit=50');
  });

  it('omits the query string when no limit is given', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ at: null, movers: [] }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
    await client.getMovers();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/movers');
  });

  it('encodes the mint in GET /api/tokens/:mint', async () => {
    const detail = { token: {}, status: 'pending', screenings: [], momentum: [] } as unknown as TokenDetailResponse;
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(detail));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getToken(MINT)).resolves.toEqual(detail);
    await client.getToken('a/b');
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`http://api.test/api/tokens/${MINT}`);
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('http://api.test/api/tokens/a%2Fb');
  });

  it('forwards an AbortSignal to fetch', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ screenings: [] }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
    const controller = new AbortController();
    await client.getScreenings({ signal: controller.signal });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/screenings',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it('throws an ApiError with the contract error code and HTTP status', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ error: { code: 'TOKEN_NOT_FOUND', message: 'Token was never seen' } }, 404),
    );
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    const error = await client.getToken(MINT).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'TOKEN_NOT_FOUND', message: 'Token was never seen' });
  });

  it('uses HTTP_ERROR when an error response has no contract body', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => new Response('Bad gateway', { status: 502 }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getHealth()).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });

  it('maps a network failure to a NETWORK_ERROR ApiError with status 0', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw new TypeError('Failed to fetch');
    });
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    const error = await client.getMovers().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('rethrows aborts untouched so callers can ignore them', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    const fetchImpl = vi.fn<FetchLike>(async () => {
      throw abort;
    });
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
    await expect(client.getMovers()).rejects.toBe(abort);
  });

  it('maps an invalid JSON body to INVALID_RESPONSE', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => new Response('<html>', { status: 200 }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
    await expect(client.getHealth()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('exposes the SSE stream URL', () => {
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl: vi.fn() });
    expect(client.streamUrl).toBe('http://api.test/api/stream');
    expect(client.baseUrl).toBe('http://api.test');
  });

  it('GETs /api/tokens/:mint/candles with interval and limit and returns the parsed body', async () => {
    const body: CandlesResponse = {
      mint: MINT,
      interval: '5m',
      totalSupply: 1_000_000_000,
      solUsd: 142.31,
      candles: [
        {
          time: 1_763_064_000,
          open: 0.00000003,
          high: 0.00000004,
          low: 0.00000002,
          close: 0.000000035,
          volumeSol: 2,
          buyVolumeSol: 1.5,
          sellVolumeSol: 0.5,
          trades: 4,
        },
      ],
      devTrades: [{ time: 1_763_064_010, side: 'buy', solAmount: 1 }],
    };
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(body));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getCandles(MINT, { interval: '5m', limit: 300 })).resolves.toEqual(body);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`http://api.test/api/tokens/${MINT}/candles?interval=5m&limit=300`);
  });

  it('omits limit from the candles query when not given and forwards the AbortSignal', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ candles: [] }));
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
    const controller = new AbortController();

    await client.getCandles(MINT, { interval: '1s', signal: controller.signal });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`http://api.test/api/tokens/${MINT}/candles?interval=1s`);
    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('maps a candles error body (INVALID_INTERVAL) to an ApiError', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () =>
      jsonResponse({ error: { code: 'INVALID_INTERVAL', message: 'Bad interval.' } }, 400),
    );
    const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });

    await expect(client.getCandles(MINT, { interval: '1m' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_INTERVAL',
    });
  });

  it('builds the per-token stream URL, relative when the base URL is empty', () => {
    expect(createApiClient({ baseUrl: 'http://api.test' }).tokenStreamUrl(MINT)).toBe(
      `http://api.test/api/tokens/${MINT}/stream`,
    );
    expect(createApiClient({ baseUrl: resolveApiUrl('/') }).tokenStreamUrl(MINT)).toBe(`/api/tokens/${MINT}/stream`);
  });
});

describe('history endpoints', () => {
  const ok = (body: unknown) => vi.fn<FetchLike>(async () => jsonResponse(body));

  it('builds GET /api/tokens with the contract param names and formats', () => {
    expect(tokenListSearch({})).toBe('');
    expect(
      tokenListSearch({
        from: '2026-11-01T05:00:00.000Z',
        to: '2026-12-01T05:00:00.000Z',
        status: ['passed', 'failed'],
        lifecycle: 'active',
        minScore: 50,
        q: 'frog & co',
        sort: { field: 'maxScore', direction: 'desc' },
        page: 2,
        pageSize: 50,
      }),
    ).toBe(
      '?from=2026-11-01T05:00:00.000Z&to=2026-12-01T05:00:00.000Z&status=passed,failed&lifecycle=active&minScore=50&q=frog%20%26%20co&sort=maxScore:desc&page=2&pageSize=50',
    );
    expect(tokenListSearch({ status: [], q: '  ' })).toBe('');
  });

  it('sends dateField right after the date bounds', () => {
    expect(
      tokenListSearch({ from: '2026-11-17T03:00:00.000Z', to: '2026-11-18T03:00:00.000Z', dateField: 'appearedAt', page: 1 }),
    ).toBe('?from=2026-11-17T03:00:00.000Z&to=2026-11-18T03:00:00.000Z&dateField=appearedAt&page=1');
  });

  it('GETs the token list, snapshots and stats', async () => {
    const list = { tokens: [], page: 1, pageSize: 50, total: 0 };
    const snapshots = { mint: MINT, lifecycle: 'active', snapshots: [] };
    const stats = {
      since: '2026-11-14T03:15:03.912Z',
      tokens: { total: 1, active: 1, dead: 0, migrated: 0 },
      screenings: { passed: 0, failed: 0, unverified: 0, pending: 1 },
      trades: 3,
      snapshots: 2,
    };
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(jsonResponse(list))
      .mockResolvedValueOnce(jsonResponse(snapshots))
      .mockResolvedValueOnce(jsonResponse(stats));
    const client = createApiClient({ baseUrl: '', fetchImpl });

    await expect(client.listTokens({ status: ['pending'], page: 1 })).resolves.toEqual(list);
    await expect(client.getTokenSnapshots(MINT)).resolves.toEqual(snapshots);
    await expect(client.getStats()).resolves.toEqual(stats);
    expect(fetchImpl.mock.calls.map((call) => call[0])).toEqual([
      '/api/tokens?status=pending&page=1',
      `/api/tokens/${MINT}/snapshots`,
      '/api/stats',
    ]);
  });

  it('raises INVALID_QUERY as an ApiError', async () => {
    const fetchImpl = ok({ error: { code: 'INVALID_QUERY', message: 'minScore must be 0-100' } });
    fetchImpl.mockResolvedValueOnce(
      jsonResponse({ error: { code: 'INVALID_QUERY', message: 'minScore must be 0-100' } }, 400),
    );
    const error = await createApiClient({ baseUrl: 'http://api.test', fetchImpl })
      .listTokens({ minScore: 500 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'INVALID_QUERY', message: 'minScore must be 0-100' });
  });
});
