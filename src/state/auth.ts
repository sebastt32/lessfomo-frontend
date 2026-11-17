import type { SessionUser } from '../api/types';

/** Why the login page is showing, when there is something to tell the visitor. */
export type SignedOutReason = 'expired' | 'signedOut' | null;

export type AuthState =
  /** Asking the server whether there is a session; nothing of the platform is shown yet. */
  | { status: 'checking' }
  | { status: 'signedOut'; reason: SignedOutReason }
  | { status: 'signedIn'; user: SessionUser }
  /** The backend predates authentication (no /api/auth endpoints): the platform is shown as before. */
  | { status: 'unavailable' }
  /** The session check could not get an answer (server down or failing). */
  | { status: 'unreachable' };

export type AuthAction =
  | { type: 'session/found'; user: SessionUser }
  | { type: 'session/missing' }
  | { type: 'session/unsupported' }
  | { type: 'session/unreachable' }
  | { type: 'session/retry' }
  /** A 401 UNAUTHENTICATED from any request or stream. */
  | { type: 'session/expired' }
  | { type: 'signIn/succeeded'; user: SessionUser }
  | { type: 'signOut/succeeded' };

export const initialAuthState: AuthState = { status: 'checking' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'session/found':
      return state.status === 'checking' ? { status: 'signedIn', user: action.user } : state;
    case 'signIn/succeeded':
      return { status: 'signedIn', user: action.user };
    case 'session/missing':
      // A late answer of the session check never overrides a login or an earlier sign-out reason.
      return state.status === 'checking' ? { status: 'signedOut', reason: null } : state;
    case 'session/unsupported':
      return state.status === 'checking' ? { status: 'unavailable' } : state;
    case 'session/unreachable':
      return state.status === 'checking' ? { status: 'unreachable' } : state;
    case 'session/retry':
      return state.status === 'unreachable' ? { status: 'checking' } : state;
    case 'session/expired':
      if (state.status === 'signedOut') return state;
      // Before anything was shown a 401 only means "not signed in yet".
      return {
        status: 'signedOut',
        reason: state.status === 'signedIn' || state.status === 'unavailable' ? 'expired' : null,
      };
    case 'signOut/succeeded':
      return { status: 'signedOut', reason: 'signedOut' };
  }
}
