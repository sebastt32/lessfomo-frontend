import { describe, expect, it, vi } from 'vitest';
import { makeCandles, makeCyclesAnalysis, MINT_A } from '../test/fixtures';
import { createApiClient, tokenListSearch, type FetchLike } from './client';

function setup(body: unknown) {
  const fetchImpl = vi.fn<FetchLike>(
    async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  );
  return { fetchImpl, client: createApiClient({ baseUrl: '', fetchImpl }) };
}

describe('token cycle client', () => {
  it('sends the phase and appeared-late filters and the new sorts to GET /api/tokens', () => {
    expect(
      tokenListSearch({
        status: ['passed'],
        phase: ['stable', 'exploding'],
        appearedLate: false,
        sort: { field: 'investWindow', direction: 'asc' },
      }),
    ).toBe('?status=passed&phase=stable,exploding&appearedLate=false&sort=investWindow:asc');
    expect(tokenListSearch({ appearedLate: true, sort: { field: 'appearedAt', direction: 'desc' } })).toBe(
      '?appearedLate=true&sort=appearedAt:desc',
    );
    // Empty phase list and no appearedLate mean "all": nothing is sent.
    expect(tokenListSearch({ phase: [] })).toBe('');
  });

  it('requests 15m and 1h candles', async () => {
    const { client, fetchImpl } = setup(makeCandles({ interval: '15m' }));
    await client.getCandles(MINT_A, { interval: '15m', limit: 1500 });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`/api/tokens/${MINT_A}/candles?interval=15m&limit=1500`);
    await client.getCandles(MINT_A, { interval: '1h' });
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(`/api/tokens/${MINT_A}/candles?interval=1h`);
  });

  it('GETs /api/analysis/cycles with the session cookie, relative when the base URL is empty', async () => {
    const body = makeCyclesAnalysis();
    const { client, fetchImpl } = setup(body);
    await expect(client.getCyclesAnalysis()).resolves.toEqual(body);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/analysis/cycles');
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ credentials: 'include' });

    await client.getCyclesAnalysis({ from: '2026-11-01T05:00:00.000Z', to: '2026-11-08T05:00:00.000Z' });
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      '/api/analysis/cycles?from=2026-11-01T05:00:00.000Z&to=2026-11-08T05:00:00.000Z',
    );
  });
});
