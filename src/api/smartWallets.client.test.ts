import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, tokenListSearch, type FetchLike } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const MINT = '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr';
const WALLET = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';

function clientWith(body: unknown, status = 200, baseUrl = 'http://api.test') {
  const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse(body, status));
  return { client: createApiClient({ baseUrl, fetchImpl }), fetchImpl };
}

describe('smart-wallet filters on list endpoints', () => {
  it('sends minSmartWallets with limit to /api/movers and /api/screenings', async () => {
    const movers = clientWith({ at: null, movers: [] });
    await movers.client.getMovers({ limit: 20, minSmartWallets: 2 });
    expect(movers.fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/movers?limit=20&minSmartWallets=2');

    const screenings = clientWith({ screenings: [] });
    await screenings.client.getScreenings({ limit: 50, minSmartWallets: 1 });
    expect(screenings.fetchImpl.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/screenings?limit=50&minSmartWallets=1',
    );
  });

  it('sends minSmartWallets alone when there is no limit', async () => {
    const { client, fetchImpl } = clientWith({ at: null, movers: [] });
    await client.getMovers({ minSmartWallets: 3 });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/movers?minSmartWallets=3');
  });

  it('adds minSmartWallets after minScore and accepts sort=smartWallets:desc for /api/tokens', () => {
    expect(
      tokenListSearch({ minScore: 50, minSmartWallets: 2, sort: { field: 'smartWallets', direction: 'desc' } }),
    ).toBe('?minScore=50&minSmartWallets=2&sort=smartWallets:desc');
    expect(tokenListSearch({ minSmartWallets: 0 })).toBe('?minSmartWallets=0');
  });
});

describe('conviction filters on list endpoints', () => {
  it('sends minConvictionWallets with limit to /api/movers and /api/screenings', async () => {
    const movers = clientWith({ at: null, movers: [] });
    await movers.client.getMovers({ limit: 20, minConvictionWallets: 3 });
    expect(movers.fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/movers?limit=20&minConvictionWallets=3');

    const screenings = clientWith({ screenings: [] });
    await screenings.client.getScreenings({ limit: 50, minConvictionWallets: 10 });
    expect(screenings.fetchImpl.mock.calls[0]?.[0]).toBe(
      'http://api.test/api/screenings?limit=50&minConvictionWallets=10',
    );
  });

  it('adds minConvictionWallets after minScore and accepts sort=convictionWallets:desc for /api/tokens', () => {
    expect(
      tokenListSearch({ minScore: 50, minConvictionWallets: 5, sort: { field: 'convictionWallets', direction: 'desc' } }),
    ).toBe('?minScore=50&minConvictionWallets=5&sort=convictionWallets:desc');
  });
});

describe('smart-wallet endpoints', () => {
  it('GETs /api/tokens/:mint/smart-wallets', async () => {
    const body = { mint: MINT, smartWallets: [] };
    const { client, fetchImpl } = clientWith(body);
    await expect(client.getTokenSmartWallets(MINT)).resolves.toEqual(body);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`http://api.test/api/tokens/${MINT}/smart-wallets`);
  });

  it('GETs /api/wallets/:address and surfaces WALLET_NOT_FOUND', async () => {
    const { client, fetchImpl } = clientWith({ error: { code: 'WALLET_NOT_FOUND', message: 'Unknown wallet' } }, 404);
    const error = await client.getWallet(WALLET).catch((e: unknown) => e);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`http://api.test/api/wallets/${WALLET}`);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'WALLET_NOT_FOUND' });
  });

  it('GETs /api/analysis/smart-wallets with optional from/to, relative to an empty base URL', async () => {
    const body = { from: 'a', to: 'b', costRoundTrip: 0.03, buckets: [] };
    const { client, fetchImpl } = clientWith(body, 200, '');
    await expect(client.getSmartWalletAnalysis()).resolves.toEqual(body);
    await client.getSmartWalletAnalysis({ from: '2026-11-01T05:00:00.000Z', to: '2026-11-08T05:00:00.000Z' });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/analysis/smart-wallets');
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      '/api/analysis/smart-wallets?from=2026-11-01T05:00:00.000Z&to=2026-11-08T05:00:00.000Z',
    );
  });

  it('asks for the analysis by conviction wallets with by=conviction, and omits by for the default', async () => {
    const body = { from: 'a', to: 'b', costRoundTrip: 0.03, buckets: [] };
    const { client, fetchImpl } = clientWith(body);
    await client.getSmartWalletAnalysis({ by: 'conviction' });
    await client.getSmartWalletAnalysis({ by: 'smartWallets' });
    await client.getSmartWalletAnalysis({ from: '2026-11-01T05:00:00.000Z', by: 'conviction' });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/analysis/smart-wallets?by=conviction');
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('http://api.test/api/analysis/smart-wallets');
    expect(fetchImpl.mock.calls[2]?.[0]).toBe(
      'http://api.test/api/analysis/smart-wallets?from=2026-11-01T05:00:00.000Z&by=conviction',
    );
  });
});
