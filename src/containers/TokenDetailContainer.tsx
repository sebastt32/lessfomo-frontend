import { lazy, Suspense, useEffect, useMemo } from 'react';
import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { TokenDetail } from '../components/organisms/TokenDetail';
import { TokenSnapshots } from '../components/organisms/TokenSnapshots';
import type { TokenSnapshotsResponse } from '../api/types';
import { useTokenSnapshots } from '../hooks/useHistoryData';
import type { ResourceResult } from '../hooks/useResource';
import { useTokenDetail } from '../hooks/useTokenDetail';
import { mergeScoreSeries } from '../lib/series';
import { selectScoreHistory } from '../state/liveFeed';
import { shortenMint } from '../lib/format';
import { useLiveFeedContext } from './LiveFeedProvider';
import { TokenSmartWalletsBody } from './TokenSmartWalletsContainer';
import { useTokenSmartWallets } from '../hooks/useSmartWallets';

export interface TokenDetailContainerProps {
  mint: string;
  onClose: () => void;
  now: number;
}

const PANEL_ID = 'token-detail';

// The chart library is only needed once a token is opened: load it as its own chunk.
const TokenChartContainer = lazy(() =>
  import('./TokenChartContainer').then((module) => ({ default: module.TokenChartContainer })),
);

function SnapshotsBody({ result, symbol }: { result: ResourceResult<TokenSnapshotsResponse>; symbol: string }) {
  const { state, retry } = result;
  switch (state.status) {
    case 'ready':
      return state.data.snapshots.length > 0 ? (
        <TokenSnapshots snapshots={state.data.snapshots} symbol={symbol} />
      ) : (
        <p className="token-detail__note">No snapshots yet. The first one is taken when the token is created.</p>
      );
    case 'unavailable':
      return (
        <p className="token-detail__note">
          Snapshots are not available for this token yet. They are taken at creation, at 1, 5, 10, 15 and 30 minutes,
          then hourly, daily and weekly while it keeps trading.
        </p>
      );
    case 'error':
      return (
        <ErrorState title="Could not load snapshots" onRetry={retry}>
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Loading snapshots…</LoadingState>;
  }
}

export function TokenDetailContainer({ mint, onClose, now }: TokenDetailContainerProps) {
  const { state: feed, meta } = useLiveFeedContext();
  const { state, retry } = useTokenDetail(meta.client, mint);
  // Fetched alongside the detail, not after it.
  const snapshots = useTokenSnapshots(meta.client, mint);
  const smartWallets = useTokenSmartWallets(meta.client, mint);
  const snapshotData = snapshots.state.status === 'ready' ? snapshots.state.data : null;
  // The live ranking is fresher than the newest snapshot; fall back to the snapshot for tokens off the ranking.
  const liquidity =
    feed.movers.items.find((mover) => mover.mint === mint)?.liquidity ??
    snapshotData?.snapshots.at(-1)?.liquidity ??
    null;
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
      body = (
        <TokenDetail
          detail={state.data}
          scores={scores}
          now={now}
          liquidity={liquidity}
          lifecycle={snapshotData?.lifecycle ?? null}
          smartWallets={<TokenSmartWalletsBody result={smartWallets} now={now} />}
          snapshots={<SnapshotsBody result={snapshots} symbol={state.data.token.symbol || shortenMint(mint)} />}
          chart={
            <Suspense fallback={<LoadingState>Loading chart…</LoadingState>}>
              <TokenChartContainer mint={mint} symbol={state.data.token.symbol || shortenMint(mint)} />
            </Suspense>
          }
        />
      );
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
