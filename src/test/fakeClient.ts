import { vi } from 'vitest';
import type { ApiClient } from '../api/client';
import { makeAnalysis, makeSmartWallet, makeWalletResponse, makeCandles, makeDetail, makeListItem, makeMover, makeScreening, makeSnapshot, makeStats, MINT_A, MINT_B } from './fixtures';

/** The signed-in user every fake session answers with. */
export const SESSION_USER = { username: 'superadmin', role: 'superadmin' as const };

/** An ApiClient whose every method is a vi.fn with a happy-path answer; override what a test needs. */
export function fakeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    baseUrl: 'http://api.test',
    streamUrl: 'http://api.test/api/stream',
    getHealth: vi.fn(async () => ({
      status: 'ok' as const,
      startedAt: '2026-11-13T20:00:00.000Z',
      sources: { pumpportal: 'connected' as const, solanaLogs: 'connecting' as const },
    })),
    getMovers: vi.fn(async () => ({ at: '2026-11-13T20:05:00.000Z', movers: [makeMover()] })),
    getScreenings: vi.fn(async () => ({ screenings: [makeScreening({ mint: MINT_B, symbol: 'CAT' })] })),
    getToken: vi.fn(async () => makeDetail()),
    getCandles: vi.fn(async () => makeCandles()),
    listTokens: vi.fn(async () => ({ tokens: [makeListItem()], page: 1, pageSize: 50, total: 1 })),
    getTokenSnapshots: vi.fn(async () => ({
      mint: MINT_A,
      lifecycle: 'active' as const,
      snapshots: [makeSnapshot(), makeSnapshot({ milestone: '5m', at: '2026-11-13T20:05:00.000Z' })],
    })),
    getStats: vi.fn(async () => makeStats()),
    getTokenSmartWallets: vi.fn(async (mint: string) => ({ mint, smartWallets: [makeSmartWallet()] })),
    getWallet: vi.fn(async () => makeWalletResponse()),
    getSmartWalletAnalysis: vi.fn(async () => makeAnalysis()),
    tokenStreamUrl: (mint: string) => `http://api.test/api/tokens/${mint}/stream`,
    login: vi.fn(async () => SESSION_USER),
    logout: vi.fn(async () => {}),
    getSession: vi.fn(async () => SESSION_USER),
    changePassword: vi.fn(async () => {}),
    onUnauthenticated: vi.fn(() => () => {}),
    ...overrides,
  };
}
