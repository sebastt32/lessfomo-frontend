import { useEffect, useMemo } from 'react';
import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { TokenDetail } from '../components/organisms/TokenDetail';
import { useTokenDetail } from '../hooks/useTokenDetail';
import { mergeScoreSeries } from '../lib/series';
import { selectScoreHistory } from '../state/liveFeed';
import { shortenMint } from '../lib/format';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface TokenDetailContainerProps {
  mint: string;
  onClose: () => void;
  now: number;
}

const PANEL_ID = 'token-detail';

export function TokenDetailContainer({ mint, onClose, now }: TokenDetailContainerProps) {
  const { state: feed, meta } = useLiveFeedContext();
  const { state, retry } = useTokenDetail(meta.client, mint);
  const live = selectScoreHistory(feed, mint);
  const detail = state.status === 'ready' ? state.data : null;
  const scores = useMemo(() => (detail ? mergeScoreSeries(detail.momentum, live) : []), [detail, live]);

  // Move focus to the panel so keyboard and screen reader users land on what they selected.
  useEffect(() => {
    document.getElementById(`${PANEL_ID}-title`)?.focus();
  }, [mint]);

  const title = detail ? detail.token.symbol || shortenMint(mint) : `Token ${shortenMint(mint)}`;

  let body;
  switch (state.status) {
    case 'ready':
      body = <TokenDetail detail={state.data} scores={scores} now={now} />;
      break;
    case 'not-found':
      body = (
        <EmptyState title="This token is not in the screener's history">
          It may have launched before the screener started, or it is not a pump.fun token.
        </EmptyState>
      );
      break;
    case 'error':
      body = (
        <ErrorState title="Could not load this token" onRetry={retry}>
          {state.error.message}
        </ErrorState>
      );
      break;
    default:
      body = <LoadingState>Loading token history…</LoadingState>;
  }

  return (
    <Panel
      id={PANEL_ID}
      className="panel--highlight"
      title={title}
      description={detail ? detail.token.name : 'Token details'}
      actions={
        <button type="button" className="button button--quiet" onClick={onClose}>
          Close
        </button>
      }
    >
      {body}
    </Panel>
  );
}
