import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { isAbortError } from '../api/client';
import { toFeedError } from '../state/errors';
import type { FeedError } from '../state/liveFeed';

export type ResourceState<T> =
  /** `data` is the previous result while a new key loads, so lists do not flash empty. */
  | { status: 'loading'; data: T | null }
  | { status: 'ready'; data: T }
  /** The endpoint does not exist on this backend yet. */
  | { status: 'unavailable' }
  | { status: 'error'; error: FeedError };

export interface ResourceResult<T> {
  state: ResourceState<T>;
  retry: () => void;
}

interface Settled<T> {
  key: string;
  state: ResourceState<T>;
}

/**
 * Loads `load()` whenever `key` changes (null = nothing to load), aborting the previous request.
 * Errors for which `isUnavailable` returns true become the 'unavailable' state instead of 'error'.
 */
export function useResource<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
  isUnavailable: (error: unknown) => boolean = () => false,
): ResourceResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [lastData, setLastData] = useState<T | null>(null);
  const requestKey = key === null ? null : `${key}#${attempt}`;

  const run = useEffectEvent((signal: AbortSignal, settledKey: string) => {
    load(signal).then(
      (data) => {
        setSettled({ key: settledKey, state: { status: 'ready', data } });
        setLastData(data);
      },
      (error: unknown) => {
        if (isAbortError(error) || signal.aborted) return;
        setSettled({
          key: settledKey,
          state: isUnavailable(error) ? { status: 'unavailable' } : { status: 'error', error: toFeedError(error) },
        });
      },
    );
  });

  useEffect(() => {
    if (requestKey === null) return;
    const controller = new AbortController();
    run(controller.signal, requestKey);
    return () => controller.abort();
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: ResourceState<T>;
  if (settled !== null && settled.key === requestKey) state = settled.state;
  else state = { status: 'loading', data: lastData };
  return { state, retry };
}
