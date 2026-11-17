import { createContext, use, useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { ApiError, isAbortError, type ApiClient } from '../api/client';
import { toAuthFailure, type AuthFailure } from '../lib/authErrors';
import { authReducer, initialAuthState, type AuthState } from '../state/auth';
import { isMissingEndpoint } from '../state/errors';

export interface AuthContextValue {
  state: AuthState;
  /** Each action resolves to null on success, or to why it failed. Passwords are only passed through, never stored. */
  actions: {
    signIn: (username: string, password: string) => Promise<AuthFailure | null>;
    signOut: () => Promise<AuthFailure | null>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<AuthFailure | null>;
    /** Checks the session again after the server could not be reached. */
    retry: () => void;
  };
  meta: { client: ApiClient };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  client: ApiClient;
  children: ReactNode;
}

/** The only place that knows how the session is checked, started and ended. */
export function AuthProvider({ client, children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const [attempt, setAttempt] = useState(0);

  // A 401 UNAUTHENTICATED from any request, at any time, means there is no session any more.
  useEffect(() => client.onUnauthenticated(() => dispatch({ type: 'session/expired' })), [client]);

  // On app start (and on retry) ask the server who is signed in.
  useEffect(() => {
    const controller = new AbortController();
    client.getSession({ signal: controller.signal }).then(
      (user) => dispatch({ type: 'session/found', user }),
      (error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        if (isMissingEndpoint(error)) dispatch({ type: 'session/unsupported' });
        else if (error instanceof ApiError && error.status === 401) dispatch({ type: 'session/missing' });
        else dispatch({ type: 'session/unreachable' });
      },
    );
    return () => controller.abort();
  }, [client, attempt]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      try {
        const user = await client.login(username, password);
        dispatch({ type: 'signIn/succeeded', user });
        return null;
      } catch (error) {
        return toAuthFailure(error);
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    try {
      await client.logout();
    } catch (error) {
      const failure = toAuthFailure(error);
      // Without a session there is nothing left to end: the 401 already moved the app to the login page.
      if (failure.kind !== 'unauthenticated') return failure;
    }
    dispatch({ type: 'signOut/succeeded' });
    return null;
  }, [client]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      try {
        await client.changePassword(currentPassword, newPassword);
        return null;
      } catch (error) {
        return toAuthFailure(error);
      }
    },
    [client],
  );

  const retry = useCallback(() => {
    dispatch({ type: 'session/retry' });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, actions: { signIn, signOut, changePassword, retry }, meta: { client } }),
    [state, signIn, signOut, changePassword, retry, client],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
