import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { MoversTable } from '../components/organisms/MoversTable';
import { formatRelativeTime } from '../lib/format';
import { isNetworkError } from '../state/errors';
import { selectVisibleMovers } from '../state/smartWalletFeed';
import { describeSmartWalletFilter } from '../lib/smartWalletFilter';
import { useMinSmartWallets } from '../hooks/useMinSmartWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface MoversContainerProps {
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  now: number;
}

export function MoversContainer({ selectedMint, onSelect, now }: MoversContainerProps) {
  const { state, smartWallets, actions } = useLiveFeedContext();
  const [min] = useMinSmartWallets();
  const { status, at, error } = state.movers;
  const visible = selectVisibleMovers(state, smartWallets, min);
  const { items } = visible;

  const description = at
    ? `Ranked by momentum score. Updated ${formatRelativeTime(at, now)}, refreshes every minute.`
    : 'Ranked by momentum score. Refreshes every minute.';

  let body;
  if (items.length > 0) {
    body = <MoversTable movers={items} selectedMint={selectedMint} onSelect={onSelect} />;
  } else if (status === 'loading') {
    body = <LoadingState>Loading the latest ranking…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState
        title={isNetworkError(error) ? 'Could not reach the screener API' : 'Could not load the ranking'}
        onRetry={actions.reload}
      >
        {error?.message}
      </ErrorState>
    );
  } else if (visible.filtered && (visible.hidden > 0 || (status === 'ready' && at !== null))) {
    body = (
      <EmptyState title="No mover passes the smart-wallet filter right now">
        {describeSmartWalletFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} ranked ${visible.hidden === 1 ? 'token was' : 'tokens were'} not bought by enough good-history wallets. `
          : 'No ranked token was bought by enough good-history wallets. '}
        Lower the minimum above, or wait for the next ranking in a minute.
      </EmptyState>
    );
  } else {
    body = (
      <EmptyState title="No movers yet">
        {at === null
          ? 'The first ranking is published one minute after the screener starts.'
          : 'No token has enough trading activity right now. The ranking refreshes every minute.'}
      </EmptyState>
    );
  }

  return (
    <Panel id="movers" title="Top movers" description={description}>
      {body}
    </Panel>
  );
}
