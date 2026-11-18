import type { ApiClient } from '../api/client';
import type { StatsResponse, TokenSnapshotsResponse } from '../api/types';
import { isMissingEndpoint, isSnapshotsUnavailable } from '../state/errors';
import { useResource, type ResourceResult } from './useResource';

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
