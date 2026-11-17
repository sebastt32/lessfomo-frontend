import type { ApiClient } from '../api/client';
import type { SmartWalletAnalysisResponse, TokenSmartWalletsResponse, WalletResponse } from '../api/types';
import { isMissingEndpoint, isTokenSubresourceUnavailable, isWalletUnavailable } from '../state/errors';
import { useResource, type ResourceResult } from './useResource';

/** GET /api/tokens/:mint/smart-wallets; 'unavailable' on a backend that predates it. */
export function useTokenSmartWallets(client: ApiClient, mint: string): ResourceResult<TokenSmartWalletsResponse> {
  return useResource(
    `smart-wallets:${mint}`,
    (signal) => client.getTokenSmartWallets(mint, { signal }),
    isTokenSubresourceUnavailable,
  );
}

/** GET /api/wallets/:address, loaded only while `address` is not null (on demand). */
export function useWallet(client: ApiClient, address: string | null): ResourceResult<WalletResponse> {
  return useResource(
    address === null ? null : `wallet:${address}`,
    (signal) => client.getWallet(address!, { signal }),
    isWalletUnavailable,
  );
}

/** GET /api/analysis/smart-wallets with the API's default date range. */
export function useSmartWalletAnalysis(client: ApiClient): ResourceResult<SmartWalletAnalysisResponse> {
  return useResource('analysis:smart-wallets', (signal) => client.getSmartWalletAnalysis({ signal }), isMissingEndpoint);
}
