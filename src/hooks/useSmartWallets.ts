import type { ApiClient } from '../api/client';
import type { TokenSmartWalletsResponse, WalletResponse } from '../api/types';
import { isTokenSubresourceUnavailable, isWalletUnavailable } from '../state/errors';
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
