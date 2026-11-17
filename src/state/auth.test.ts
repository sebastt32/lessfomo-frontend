import { describe, expect, it } from 'vitest';
import { authReducer, initialAuthState, type AuthState } from './auth';

const USER = { username: 'superadmin', role: 'superadmin' as const };
const signedIn: AuthState = { status: 'signedIn', user: USER };

describe('authReducer', () => {
  it('starts checking the session', () => {
    expect(initialAuthState).toEqual({ status: 'checking' });
  });

  it('signs in when the session check finds a user', () => {
    expect(authReducer(initialAuthState, { type: 'session/found', user: USER })).toEqual(signedIn);
  });

  it('signs out without a reason when the session check finds nobody', () => {
    expect(authReducer(initialAuthState, { type: 'session/missing' })).toEqual({ status: 'signedOut', reason: null });
  });

  it('marks authentication as unavailable on a backend without auth endpoints', () => {
    expect(authReducer(initialAuthState, { type: 'session/unsupported' })).toEqual({ status: 'unavailable' });
  });

  it('reports an unreachable server and checks again on retry', () => {
    const unreachable = authReducer(initialAuthState, { type: 'session/unreachable' });
    expect(unreachable).toEqual({ status: 'unreachable' });
    expect(authReducer(unreachable, { type: 'session/retry' })).toEqual({ status: 'checking' });
  });

  it('signs in after a successful login', () => {
    const signedOut: AuthState = { status: 'signedOut', reason: 'expired' };
    expect(authReducer(signedOut, { type: 'signIn/succeeded', user: USER })).toEqual(signedIn);
  });

  it('signs out on request, remembering why', () => {
    expect(authReducer(signedIn, { type: 'signOut/succeeded' })).toEqual({ status: 'signedOut', reason: 'signedOut' });
  });

  it('moves a signed-in session to signed out (expired) on a 401 from anywhere', () => {
    expect(authReducer(signedIn, { type: 'session/expired' })).toEqual({ status: 'signedOut', reason: 'expired' });
  });

  it('requires a login when a backend that had no authentication starts answering 401', () => {
    expect(authReducer({ status: 'unavailable' }, { type: 'session/expired' })).toEqual({
      status: 'signedOut',
      reason: 'expired',
    });
  });

  it('does not call a first visit "expired" when the session check itself answers 401', () => {
    expect(authReducer(initialAuthState, { type: 'session/expired' })).toEqual({ status: 'signedOut', reason: null });
  });

  it('keeps the reason of an existing signed-out state', () => {
    const signedOut: AuthState = { status: 'signedOut', reason: 'signedOut' };
    expect(authReducer(signedOut, { type: 'session/expired' })).toBe(signedOut);
    expect(authReducer(signedOut, { type: 'session/missing' })).toBe(signedOut);
  });

  it('ignores a late session answer once somebody signed in', () => {
    expect(authReducer(signedIn, { type: 'session/missing' })).toBe(signedIn);
    expect(authReducer(signedIn, { type: 'session/unsupported' })).toBe(signedIn);
    expect(authReducer(signedIn, { type: 'session/unreachable' })).toBe(signedIn);
  });
});
