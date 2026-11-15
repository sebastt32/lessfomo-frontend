import { tokenListSearch, type ApiClient, type TokenListQuery } from '../api/client';
import type { StatsResponse, TokenListResponse, TokenSnapshotsResponse } from '../api/types';
import { isMissingEndpoint, isSnapshotsUnavailable } from '../state/errors';
import { useResource, type ResourceResult } from './useResource';

/** GET /api/tokens for the query; refetches only when the query string changes. */
export function useTokenList(client: ApiClient, query: TokenListQuery): ResourceResult<TokenListResponse> {
  // The query object is rebuilt every render; its serialized form is what identifies the request.
  return useResource(
    `tokens${tokenListSearch(query)}`,
    (signal) => client.listTokens(query, { signal }),
    isMissingEndpoint,
  );
}

export function useTokenSnapshots(client: ApiClient, mint: string): ResourceResult<TokenSnapshotsResponse> {
  return useResource(
    `snapshots:${mint}`,
    (signal) => client.getTokenSnapshots(mint, { signal }),
    isSnapshotsUnavailable,
  );
}

/** GET /api/stats, reloaded whenever `refreshKey` changes (e.g. once a minute). */
export function useStats(client: ApiClient, refreshKey: string | number): ResourceResult<StatsResponse> {
  return useResource(`stats:${refreshKey}`, (signal) => client.getStats({ signal }), isMissingEndpoint);
}
