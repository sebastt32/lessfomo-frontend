import { useCallback, useEffect, useState } from 'react';
import { ApiError, isAbortError, type ApiClient } from '../api/client';
import type { TokenDetailResponse } from '../api/types';
import { toFeedError } from '../state/errors';
import type { FeedError } from '../state/liveFeed';

export type TokenDetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: TokenDetailResponse }
  | { status: 'not-found' }
  | { status: 'error'; error: FeedError };

interface Result {
  key: string;
  state: TokenDetailState;
}

export interface TokenDetailResult {
  state: TokenDetailState;
  retry: () => void;
}

export function useTokenDetail(client: ApiClient, mint: string | null): TokenDetailResult {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = mint === null ? null : `${mint}#${attempt}`;

  useEffect(() => {
    if (mint === null || key === null) return;
    const controller = new AbortController();
    client.getToken(mint, { signal: controller.signal }).then(
      (data) => setResult({ key, state: { status: 'ready', data } }),
      (error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted) return;
        // An address that is not a mint (400 INVALID_MINT, e.g. a mistyped link) is as absent as an unknown token.
        if (error instanceof ApiError && (error.code === 'TOKEN_NOT_FOUND' || error.code === 'INVALID_MINT')) {
          setResult({ key, state: { status: 'not-found' } });
        } else {
          setResult({ key, state: { status: 'error', error: toFeedError(error) } });
        }
      },
    );
    return () => controller.abort();
  }, [client, mint, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  // Derive the visible state instead of resetting it in an effect.
  let state: TokenDetailState;
  if (mint === null) state = { status: 'idle' };
  else if (result === null || result.key !== key) state = { status: 'loading' };
  else state = result.state;
  return { state, retry };
}
