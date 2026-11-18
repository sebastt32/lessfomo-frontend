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
  if (seconds === null) return 'unos minutos';
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
}

/** What the login form says for a failure. */
export function authFailureMessage(failure: AuthFailure): string {
  switch (failure.kind) {
    case 'invalidCredentials':
      return 'Usuario o contraseña incorrectos';
    case 'tooManyAttempts':
      return `Demasiados intentos. Intenta de nuevo en ${waitText(failure.retryAfterSeconds)}.`;
    case 'network':
      return 'No se puede conectar con el servidor';
    case 'forbiddenOrigin':
      return 'El servidor no acepta inicios de sesión desde esta dirección';
    case 'unauthenticated':
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    case 'weakPassword':
      return 'Usa al menos 12 caracteres y una contraseña distinta de la actual';
    case 'unknown':
      return 'Algo salió mal. Inténtalo de nuevo';
  }
}

export const MIN_PASSWORD_LENGTH = 12;

/** What the change-password form says: there, wrong credentials mean the current password. */
export function passwordChangeFailureMessage(failure: AuthFailure): string {
  if (failure.kind === 'invalidCredentials') return 'La contraseña actual es incorrecta';
  return authFailureMessage(failure);
}
