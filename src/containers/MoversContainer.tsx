import { useMemo } from 'react';
import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { MoverCards } from '../components/organisms/MoverCards';
import { MoversTable } from '../components/organisms/MoversTable';
import { SMALL_SCREEN, useMediaQuery } from '../hooks/useMediaQuery';
import { formatRelativeTime } from '../lib/format';
import { isNetworkError } from '../state/errors';
import { selectCycle } from '../state/cycleFeed';
import { selectVisibleMovers } from '../state/smartWalletFeed';
import { describeConvictionFilter } from '../lib/smartWalletFilter';
import { useMinConvictionWallets } from '../hooks/useMinConvictionWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface MoversContainerProps {
  /** Opens the token's own view. */
  onSelect: (mint: string) => void;
  now: number;
}

export function MoversContainer({ onSelect, now }: MoversContainerProps) {
  const { state, smartWallets, cycles, actions } = useLiveFeedContext();
  const [min] = useMinConvictionWallets();
  const small = useMediaQuery(SMALL_SCREEN);
  const { status, at, error } = state.movers;
  const visible = selectVisibleMovers(state, smartWallets, min);
  // A `cycle` event can be newer than the minute's ranking: show whichever reading was updated last.
  const items = useMemo(
    () =>
      visible.items.map((mover) => {
        const cycle = selectCycle(cycles, mover.mint, mover.cycle);
        return cycle === null || cycle === mover.cycle ? mover : { ...mover, cycle };
      }),
    [visible.items, cycles],
  );

  const description = at
    ? `Ranked by momentum score. Updated ${formatRelativeTime(at, now)}, refreshes every minute.`
    : 'Ranked by momentum score. Refreshes every minute.';

  let body;
  if (items.length > 0) {
    body = small ? (
      <MoverCards movers={items} onSelect={onSelect} now={now} />
    ) : (
      <MoversTable movers={items} onSelect={onSelect} now={now} />
    );
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
      <EmptyState title="No mover passes the conviction-wallet filter right now">
        {describeConvictionFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} ranked ${visible.hidden === 1 ? 'token was' : 'tokens were'} not bought by enough conviction wallets. `
          : 'No ranked token was bought by enough conviction wallets. '}
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
