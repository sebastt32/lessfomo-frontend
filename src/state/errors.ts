import { ApiError } from '../api/client';
import type { FeedError } from './liveFeed';

export function toFeedError(error: unknown): FeedError {
  if (error instanceof ApiError) return { code: error.code, message: error.message };
  return { code: 'UNKNOWN', message: error instanceof Error ? error.message : 'Algo salió mal.' };
}

export function isNetworkError(error: FeedError | null): boolean {
  return error?.code === 'NETWORK_ERROR';
}

/**
 * True when the backend does not have the endpoint yet (it predates the history API): an unknown route
 * answers 404 NOT_FOUND. TOKEN_NOT_FOUND is a real answer about one token, not a missing endpoint.
 */
export function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && error.code !== 'TOKEN_NOT_FOUND';
}

/**
 * Snapshots are unavailable when the endpoint is missing, when the token has no stored history yet
 * (TOKEN_NOT_FOUND), or on a backend that predates the route and reads ":mint/snapshots" as a malformed
 * mint (400 INVALID_MINT; the mint itself is known to be valid because its detail loaded).
 */
export function isSnapshotsUnavailable(error: unknown): boolean {
  return isTokenSubresourceUnavailable(error);
}

/** Same rule for any GET /api/tokens/:mint/<resource> added after the detail endpoint (snapshots, smart wallets). */
export function isTokenSubresourceUnavailable(error: unknown): boolean {
  return (
    isMissingEndpoint(error) ||
    (error instanceof ApiError && (error.code === 'TOKEN_NOT_FOUND' || error.code === 'INVALID_MINT'))
  );
}

/** GET /api/wallets/:address is missing (older backend) or does not know the wallet. */
export function isWalletUnavailable(error: unknown): boolean {
  return isMissingEndpoint(error) || (error instanceof ApiError && error.code === 'WALLET_NOT_FOUND');
}
