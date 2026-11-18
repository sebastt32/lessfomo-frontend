import { vi } from 'vitest';
import { createApiClient, type FetchLike } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { makeListItem, makeMover, makeScreening, makeStats, MINT_B, makeCyclesAnalysis } from './fixtures';

export const USERNAME = 'superadmin';
export const PASSWORD = 'correct horse battery staple';
export const USER = { username: USERNAME, role: 'superadmin' as const };

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

export const apiError = (status: number, code: string, headers: Record<string, string> = {}) =>
  json({ error: { code, message: code } }, status, headers);

export interface RecordedCall {
  method: string;
  path: string;
  body: unknown;
}

export interface FakeBackendOptions {
  /** Start with a valid session cookie. */
  signedIn?: boolean;
  /** false simulates a backend that predates authentication: /api/auth/* is 404 and data is open. */
  auth?: boolean;
}

/**
 * An in-memory backend that follows the "Authentication" contract, behind a real ApiClient:
 * everything but /api/health and login answers 401 UNAUTHENTICATED without a session.
 */
export function fakeBackend({ signedIn = false, auth = true }: FakeBackendOptions = {}) {
  const state = {
    signedIn,
    password: PASSWORD,
    symbol: 'FROG',
    calls: [] as RecordedCall[],
    /** Set to answer the next matching request by hand (return undefined to fall through). */
    intercept: null as ((call: RecordedCall) => Response | Promise<Response> | undefined) | null,
  };

  const fetchImpl: FetchLike = async (url, init) => {
    const path = url.replace('http://api.test', '');
    const call: RecordedCall = {
      method: init?.method ?? 'GET',
      path,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    state.calls.push(call);
    const intercepted = state.intercept?.(call);
    if (intercepted) return intercepted;

    if (path === '/api/health') {
      return json({
        status: 'ok',
        startedAt: '2026-11-13T20:00:00.000Z',
        sources: { pumpportal: 'connected', solanaLogs: 'connected' },
      });
    }
    if (path.startsWith('/api/auth/')) {
      if (!auth) return apiError(404, 'NOT_FOUND');
      if (path === '/api/auth/login') {
        const body = call.body as { username?: string; password?: string };
        if (body.username !== USERNAME || body.password !== state.password) return apiError(401, 'INVALID_CREDENTIALS');
        state.signedIn = true;
        return json({ user: USER });
      }
      if (path === '/api/auth/logout') {
        state.signedIn = false;
        return new Response(null, { status: 204 });
      }
      if (!state.signedIn) return apiError(401, 'UNAUTHENTICATED');
      if (path === '/api/auth/me') return json({ user: USER });
      if (path === '/api/auth/password') {
        const body = call.body as { currentPassword: string; newPassword: string };
        if (body.currentPassword !== state.password) return apiError(401, 'INVALID_CREDENTIALS');
        if (body.newPassword.length < 12 || body.newPassword === state.password) return apiError(400, 'WEAK_PASSWORD');
        state.password = body.newPassword;
        return new Response(null, { status: 204 });
      }
      return apiError(404, 'NOT_FOUND');
    }
    if (auth && !state.signedIn) return apiError(401, 'UNAUTHENTICATED');

    if (path.startsWith('/api/movers')) {
      return json({ at: '2026-11-13T20:05:00.000Z', movers: [makeMover({ symbol: state.symbol })] });
    }
    if (path.startsWith('/api/screenings')) return json({ screenings: [makeScreening({ mint: MINT_B, symbol: 'CAT' })] });
    if (path.startsWith('/api/stats')) return json(makeStats());
    if (path.startsWith('/api/tokens?') || path === '/api/tokens') {
      return json({ tokens: [makeListItem()], page: 1, pageSize: 50, total: 1 });
    }
    if (path.startsWith('/api/analysis/cycles')) return json(makeCyclesAnalysis());
    return apiError(404, 'NOT_FOUND');
  };

  const streams: { options: StreamOptions; close: ReturnType<typeof vi.fn> }[] = [];
  const connect = vi.fn((options: StreamOptions) => {
    const stream = { options, close: vi.fn() };
    streams.push(stream);
    return { close: stream.close };
  });

  return {
    state,
    client: createApiClient({ baseUrl: 'http://api.test', fetchImpl }),
    connect,
    streams,
    /** Requests other than the session endpoints: the platform's own data. */
    dataCalls: () => state.calls.filter((call) => !call.path.startsWith('/api/auth/')),
    authCalls: (path: string) => state.calls.filter((call) => call.path === path),
  };
}

export type FakeBackend = ReturnType<typeof fakeBackend>;

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
