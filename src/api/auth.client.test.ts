import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, type FetchLike } from './client';
import { authFailureMessage, toAuthFailure } from '../lib/authErrors';

const USER = { username: 'superadmin', role: 'superadmin' as const };

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

const errorResponse = (status: number, code: string, headers: Record<string, string> = {}) =>
  jsonResponse({ error: { code, message: code } }, status, headers);

const noContent = () => new Response(null, { status: 204 });

function setup(respond: () => Response | Promise<Response>) {
  const fetchImpl = vi.fn<FetchLike>(async () => respond());
  const client = createApiClient({ baseUrl: 'http://api.test', fetchImpl });
  const call = (index = 0) => {
    const [url, init] = fetchImpl.mock.calls[index]!;
    return { url, init: init!, headers: new Headers(init!.headers) };
  };
  return { client, fetchImpl, call };
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('credentials on every request', () => {
  it('sends the session cookie with data requests', async () => {
    const { client, call } = setup(() => jsonResponse({ screenings: [] }));
    await client.getScreenings();
    expect(call().init.credentials).toBe('include');
    expect(call().init.method ?? 'GET').toBe('GET');
  });

  it('sends the session cookie with every auth request', async () => {
    const { client, fetchImpl } = setup(() => jsonResponse({ user: USER }));
    await client.getSession();
    await client.login('superadmin', 'correct horse battery');
    for (const [, init] of fetchImpl.mock.calls) expect(init?.credentials).toBe('include');
  });
});

describe('auth endpoints', () => {
  it('login POSTs the credentials as JSON and returns the user', async () => {
    const { client, call } = setup(() => jsonResponse({ user: USER }));
    await expect(client.login('superadmin', 'correct horse battery')).resolves.toEqual(USER);
    expect(call().url).toBe('http://api.test/api/auth/login');
    expect(call().init.method).toBe('POST');
    expect(call().headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(call().init.body as string)).toEqual({
      username: 'superadmin',
      password: 'correct horse battery',
    });
  });

  it('never puts the password in the request URL', async () => {
    const { client, call } = setup(() => jsonResponse({ user: USER }));
    await client.login('superadmin', 'correct horse battery');
    expect(call().url).not.toContain('correct');
  });

  it('getSession GETs /api/auth/me and returns the user', async () => {
    const { client, call } = setup(() => jsonResponse({ user: USER }));
    await expect(client.getSession()).resolves.toEqual(USER);
    expect(call().url).toBe('http://api.test/api/auth/me');
    expect(call().init.method ?? 'GET').toBe('GET');
  });

  it('logout POSTs with a JSON content type and accepts 204 without a body', async () => {
    const { client, call } = setup(noContent);
    await expect(client.logout()).resolves.toBeUndefined();
    expect(call().url).toBe('http://api.test/api/auth/logout');
    expect(call().init.method).toBe('POST');
    expect(call().headers.get('Content-Type')).toBe('application/json');
  });

  it('changePassword POSTs currentPassword and newPassword and accepts 204', async () => {
    const { client, call } = setup(noContent);
    await expect(client.changePassword('old password 123', 'new password 4567')).resolves.toBeUndefined();
    expect(call().url).toBe('http://api.test/api/auth/password');
    expect(call().init.method).toBe('POST');
    expect(call().headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(call().init.body as string)).toEqual({
      currentPassword: 'old password 123',
      newPassword: 'new password 4567',
    });
  });

  it('keeps relative URLs with an empty base URL', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => jsonResponse({ user: USER }));
    await createApiClient({ baseUrl: '', fetchImpl }).getSession();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/auth/me');
  });
});

describe('auth error mapping', () => {
  it('maps 401 INVALID_CREDENTIALS', async () => {
    const { client } = setup(() => errorResponse(401, 'INVALID_CREDENTIALS'));
    const error = await rejection(client.login('superadmin', 'nope'));
    expect(error).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(toAuthFailure(error)).toEqual({ kind: 'invalidCredentials' });
  });

  it('maps 429 TOO_MANY_ATTEMPTS with the Retry-After seconds', async () => {
    const { client } = setup(() => errorResponse(429, 'TOO_MANY_ATTEMPTS', { 'Retry-After': '840' }));
    const error = await rejection(client.login('superadmin', 'nope'));
    expect(error.retryAfterSeconds).toBe(840);
    expect(toAuthFailure(error)).toEqual({ kind: 'tooManyAttempts', retryAfterSeconds: 840 });
  });

  it('maps TOO_MANY_ATTEMPTS without a readable Retry-After header', async () => {
    const { client } = setup(() => errorResponse(429, 'TOO_MANY_ATTEMPTS'));
    const error = await rejection(client.login('superadmin', 'nope'));
    expect(toAuthFailure(error)).toEqual({ kind: 'tooManyAttempts', retryAfterSeconds: null });
  });

  it('maps 401 UNAUTHENTICATED, 400 WEAK_PASSWORD and 403 FORBIDDEN_ORIGIN', async () => {
    const cases = [
      [401, 'UNAUTHENTICATED', { kind: 'unauthenticated' }],
      [400, 'WEAK_PASSWORD', { kind: 'weakPassword' }],
      [403, 'FORBIDDEN_ORIGIN', { kind: 'forbiddenOrigin' }],
    ] as const;
    for (const [status, code, failure] of cases) {
      const { client } = setup(() => errorResponse(status, code));
      const error = await rejection(client.changePassword('old password 123', 'new password 4567'));
      expect(error).toMatchObject({ status, code });
      expect(toAuthFailure(error)).toEqual(failure);
    }
  });

  it('maps a network failure', async () => {
    const { client } = setup(() => {
      throw new TypeError('Failed to fetch');
    });
    const error = await rejection(client.login('superadmin', 'nope'));
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(toAuthFailure(error)).toEqual({ kind: 'network' });
  });

  it('maps anything else to an unknown failure', async () => {
    const { client } = setup(() => errorResponse(500, 'INTERNAL_ERROR'));
    expect(toAuthFailure(await rejection(client.login('superadmin', 'nope')))).toEqual({ kind: 'unknown' });
    expect(toAuthFailure(new Error('boom'))).toEqual({ kind: 'unknown' });
  });

  it('never includes the password in an error', async () => {
    const { client } = setup(() => {
      throw new TypeError('Failed to fetch');
    });
    const error = await rejection(client.login('superadmin', 'hunter2-hunter2'));
    expect(JSON.stringify({ ...error, message: error.message })).not.toContain('hunter2');
  });
});

describe('authFailureMessage', () => {
  it('words each failure for the login form', () => {
    expect(authFailureMessage({ kind: 'invalidCredentials' })).toBe('Usuario o contraseña incorrectos');
    expect(authFailureMessage({ kind: 'network' })).toBe('No se puede conectar con el servidor');
    expect(authFailureMessage({ kind: 'tooManyAttempts', retryAfterSeconds: 840 })).toBe(
      'Demasiados intentos. Intenta de nuevo en 14 minutos.',
    );
  });

  it('rounds the wait up to whole minutes and handles one minute', () => {
    expect(authFailureMessage({ kind: 'tooManyAttempts', retryAfterSeconds: 61 })).toBe(
      'Demasiados intentos. Intenta de nuevo en 2 minutos.',
    );
    expect(authFailureMessage({ kind: 'tooManyAttempts', retryAfterSeconds: 30 })).toBe(
      'Demasiados intentos. Intenta de nuevo en 1 minuto.',
    );
    expect(authFailureMessage({ kind: 'tooManyAttempts', retryAfterSeconds: null })).toBe(
      'Demasiados intentos. Intenta de nuevo en unos minutos.',
    );
  });
});

describe('401 UNAUTHENTICATED from any request', () => {
  it('notifies subscribers and still rejects', async () => {
    const { client } = setup(() => errorResponse(401, 'UNAUTHENTICATED'));
    const listener = vi.fn();
    client.onUnauthenticated(listener);
    await rejection(client.getMovers());
    await rejection(client.getSession());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify for wrong credentials or other errors', async () => {
    const listener = vi.fn();
    const wrong = setup(() => errorResponse(401, 'INVALID_CREDENTIALS'));
    wrong.client.onUnauthenticated(listener);
    await rejection(wrong.client.login('superadmin', 'nope'));
    const missing = setup(() => errorResponse(404, 'NOT_FOUND'));
    missing.client.onUnauthenticated(listener);
    await rejection(missing.client.getSession());
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribing', async () => {
    const { client } = setup(() => errorResponse(401, 'UNAUTHENTICATED'));
    const listener = vi.fn();
    const unsubscribe = client.onUnauthenticated(listener);
    unsubscribe();
    await rejection(client.getStats());
    expect(listener).not.toHaveBeenCalled();
  });
});
