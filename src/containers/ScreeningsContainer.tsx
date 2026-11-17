import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { ScreeningsFeed } from '../components/organisms/ScreeningsFeed';
import { useMemo } from 'react';
import type { SmartWalletCounts } from '../api/types';
import { isNetworkError } from '../state/errors';
import { selectSmartWalletCounts, selectVisibleScreenings } from '../state/smartWalletFeed';
import { describeSmartWalletFilter } from '../lib/smartWalletFilter';
import { useMinSmartWallets } from '../hooks/useMinSmartWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface ScreeningsContainerProps {
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  now: number;
}

export function ScreeningsContainer({ selectedMint, onSelect, now }: ScreeningsContainerProps) {
  const { state, smartWallets, actions } = useLiveFeedContext();
  const [min] = useMinSmartWallets();
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

  let body;
  if (items.length > 0) {
    body = (
      <ScreeningsFeed
        screenings={items}
        selectedMint={selectedMint}
        onSelect={onSelect}
        now={now}
        createdAt={state.createdAt}
        smartWallets={counts}
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
      <EmptyState title="No safety check passes the smart-wallet filter yet">
        {describeSmartWalletFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} recent ${visible.hidden === 1 ? 'check is' : 'checks are'} hidden because no or too few good-history wallets bought those tokens. `
          : ''}
        Tokens appear here as soon as enough good-history wallets buy them. Lower the minimum above to see more.
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
