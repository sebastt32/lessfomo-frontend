import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { ScreeningsFeed } from '../components/organisms/ScreeningsFeed';
import { useMemo } from 'react';
import type { SmartWalletCounts, TokenCycle } from '../api/types';
import { selectCycle } from '../state/cycleFeed';
import { isNetworkError } from '../state/errors';
import { selectSmartWalletCounts, selectVisibleScreenings } from '../state/smartWalletFeed';
import { describeConvictionFilter } from '../lib/smartWalletFilter';
import { useMinConvictionWallets } from '../hooks/useMinConvictionWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface ScreeningsContainerProps {
  /** Opens the token's own view. */
  onSelect: (mint: string) => void;
  now: number;
}

export function ScreeningsContainer({ onSelect, now }: ScreeningsContainerProps) {
  const { state, smartWallets, cycles, actions } = useLiveFeedContext();
  const [min] = useMinConvictionWallets();
  const { status, error } = state.screenings;
  const visible = selectVisibleScreenings(state, smartWallets, min);
  const { items } = visible;
  const counts = useMemo(() => {
    const byMint: Record<string, SmartWalletCounts> = {};
    for (const screening of items) {
      const known = selectSmartWalletCounts(smartWallets, screening.mint);
      if (known) byMint[screening.mint] = known;
    }
    return byMint;
  }, [items, smartWallets]);
  // Safety checks do not carry the cycle: it comes from the rankings and `cycle` events seen live.
  const cyclesByMint = useMemo(() => {
    const byMint: Record<string, TokenCycle> = {};
    for (const screening of items) {
      const known = selectCycle(cycles, screening.mint);
      if (known) byMint[screening.mint] = known;
    }
    return byMint;
  }, [items, cycles]);

  let body;
  if (items.length > 0) {
    body = (
      <ScreeningsFeed
        screenings={items}
        onSelect={onSelect}
        now={now}
        createdAt={state.createdAt}
        smartWallets={counts}
        cycles={cyclesByMint}
      />
    );
  } else if (status === 'loading') {
    body = <LoadingState>Loading recent safety checks…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState
        title={isNetworkError(error) ? 'Could not reach the screener API' : 'Could not load safety checks'}
        onRetry={actions.reload}
      >
        {error?.message}
      </ErrorState>
    );
  } else if (visible.filtered && status === 'ready') {
    body = (
      <EmptyState title="No safety check passes the conviction-wallet filter yet">
        {describeConvictionFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} recent ${visible.hidden === 1 ? 'check is' : 'checks are'} hidden because too few conviction wallets bought those tokens. `
          : ''}
        Tokens appear here as soon as enough conviction wallets buy them. Lower the minimum above to see more.
      </EmptyState>
    );
  } else {
    body = (
      <EmptyState title="No safety checks yet">
        New tokens are checked shortly after they launch. Results appear here as they finish.
      </EmptyState>
    );
  }

  return (
    <Panel
      id="screenings"
      title="Latest safety checks"
      description="Holder concentration, creator share and authority checks, newest first."
    >
      {body}
    </Panel>
  );
}
