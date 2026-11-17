import { createContext, use, useMemo, type ReactNode } from 'react';
import type { ApiClient } from '../api/client';
import { useLiveFeed, type ConnectFn } from '../hooks/useLiveFeed';
import type { LiveFeedState } from '../state/liveFeed';
import type { SmartWalletFeedState } from '../state/smartWalletFeed';
import { DEFAULT_MIN_CONVICTION_WALLETS } from '../lib/smartWalletFilter';

export interface LiveFeedContextValue {
  state: LiveFeedState;
  /** Smart-wallet counts and whether the backend reports them. */
  smartWallets: SmartWalletFeedState;
  actions: { reload: () => void };
  meta: { client: ApiClient; minConvictionWallets: number };
}

const LiveFeedContext = createContext<LiveFeedContextValue | null>(null);

export interface LiveFeedProviderProps {
  client: ApiClient;
  connect?: ConnectFn;
  /** The active conviction-wallet threshold (from the URL); defaults to the public minimum, 3. */
  minConvictionWallets?: number;
  children: ReactNode;
}

/** The only place that knows how live data is fetched and kept up to date. */
export function LiveFeedProvider({
  client,
  connect,
  minConvictionWallets = DEFAULT_MIN_CONVICTION_WALLETS,
  children,
}: LiveFeedProviderProps) {
  const { state, smartWallets, reload } = useLiveFeed(
    connect ? { client, connect, minConvictionWallets } : { client, minConvictionWallets },
  );
  const value = useMemo<LiveFeedContextValue>(
    () => ({ state, smartWallets, actions: { reload }, meta: { client, minConvictionWallets } }),
    [state, smartWallets, reload, client, minConvictionWallets],
  );
  return <LiveFeedContext value={value}>{children}</LiveFeedContext>;
}

export function useLiveFeedContext(): LiveFeedContextValue {
  const value = use(LiveFeedContext);
  if (!value) throw new Error('useLiveFeedContext must be used inside <LiveFeedProvider>.');
  return value;
}
