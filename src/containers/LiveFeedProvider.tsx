import { createContext, use, useMemo, type ReactNode } from 'react';
import type { ApiClient } from '../api/client';
import { useLiveFeed, type ConnectFn } from '../hooks/useLiveFeed';
import type { LiveFeedState } from '../state/liveFeed';

export interface LiveFeedContextValue {
  state: LiveFeedState;
  actions: { reload: () => void };
  meta: { client: ApiClient };
}

const LiveFeedContext = createContext<LiveFeedContextValue | null>(null);

export interface LiveFeedProviderProps {
  client: ApiClient;
  connect?: ConnectFn;
  children: ReactNode;
}

/** The only place that knows how live data is fetched and kept up to date. */
export function LiveFeedProvider({ client, connect, children }: LiveFeedProviderProps) {
  const { state, reload } = useLiveFeed(connect ? { client, connect } : { client });
  const value = useMemo<LiveFeedContextValue>(
    () => ({ state, actions: { reload }, meta: { client } }),
    [state, reload, client],
  );
  return <LiveFeedContext value={value}>{children}</LiveFeedContext>;
}

export function useLiveFeedContext(): LiveFeedContextValue {
  const value = use(LiveFeedContext);
  if (!value) throw new Error('useLiveFeedContext must be used inside <LiveFeedProvider>.');
  return value;
}
