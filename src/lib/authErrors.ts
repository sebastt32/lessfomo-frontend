import { ApiError } from '../api/client';

/** Why an authentication request failed, independent of HTTP details. */
export type AuthFailure =
  | { kind: 'invalidCredentials' }
  | { kind: 'tooManyAttempts'; retryAfterSeconds: number | null }
  | { kind: 'unauthenticated' }
  | { kind: 'weakPassword' }
  | { kind: 'forbiddenOrigin' }
  | { kind: 'network' }
  | { kind: 'unknown' };

/** Maps the API's error codes (see "Authentication" in the contract) to a typed failure. */
export function toAuthFailure(error: unknown): AuthFailure {
  if (!(error instanceof ApiError)) return { kind: 'unknown' };
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return { kind: 'invalidCredentials' };
    case 'TOO_MANY_ATTEMPTS':
      return { kind: 'tooManyAttempts', retryAfterSeconds: error.retryAfterSeconds };
    case 'UNAUTHENTICATED':
      return { kind: 'unauthenticated' };
    case 'WEAK_PASSWORD':
      return { kind: 'weakPassword' };
    case 'FORBIDDEN_ORIGIN':
      return { kind: 'forbiddenOrigin' };
    case 'NETWORK_ERROR':
      return { kind: 'network' };
    default:
      return { kind: 'unknown' };
  }
}

function waitText(seconds: number | null): string {
  if (seconds === null) return 'a few minutes';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

/** What the login form says for a failure. */
export function authFailureMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'invalidCredentials':
      return 'Wrong username or password';
    case 'tooManyAttempts':
      return `Too many attempts. Try again in ${waitText(failure.retryAfterSeconds)}`;
    case 'network':
      return 'Cannot reach the server';
    case 'forbiddenOrigin':
      return 'The server does not accept sign-ins from this address';
    case 'unauthenticated':
      return 'Your session expired. Sign in again';
    case 'weakPassword':
      return 'Use at least 12 characters, different from the current password';
    case 'unknown':
      return 'Something went wrong. Try again';
  }
}

export const MIN_PASSWORD_LENGTH = 12;

/** What the change-password form says: there, wrong credentials mean the current password. */
export function passwordChangeFailureMessage(failure: AuthFailure): string {
  if (failure.kind === 'invalidCredentials') return 'The current password is wrong';
  return authFailureMessage(failure);
}
