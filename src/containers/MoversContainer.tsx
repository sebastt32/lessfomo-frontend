import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { MoversTable } from '../components/organisms/MoversTable';
import { formatRelativeTime } from '../lib/format';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface MoversContainerProps {
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  now: number;
}

export function MoversContainer({ selectedMint, onSelect, now }: MoversContainerProps) {
  const { state, actions } = useLiveFeedContext();
  const { status, at, items, error } = state.movers;

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
