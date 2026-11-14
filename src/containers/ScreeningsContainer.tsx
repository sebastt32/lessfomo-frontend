import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { ScreeningsFeed } from '../components/organisms/ScreeningsFeed';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface ScreeningsContainerProps {
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  now: number;
}

export function ScreeningsContainer({ selectedMint, onSelect, now }: ScreeningsContainerProps) {
  const { state, actions } = useLiveFeedContext();
  const { status, items, error } = state.screenings;

  let body;
  if (items.length > 0) {
    body = <ScreeningsFeed screenings={items} selectedMint={selectedMint} onSelect={onSelect} now={now} />;
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
