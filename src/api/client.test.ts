import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, DEFAULT_API_URL, resolveApiUrl, type FetchLike } from './client';
import type { HealthResponse, MoversResponse, ScreeningsResponse, TokenDetailResponse } from './types';

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
});
