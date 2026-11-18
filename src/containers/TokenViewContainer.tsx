import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import type { TokenCycle, TokenSnapshotsResponse } from '../api/types';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { CycleSummary } from '../components/organisms/CycleSummary';
import { TokenDetail } from '../components/organisms/TokenDetail';
import { TokenSnapshots } from '../components/organisms/TokenSnapshots';
import { TOKEN_VIEW_TITLE_ID, TokenView } from '../components/organisms/TokenView';
import { useTokenSnapshots } from '../hooks/useHistoryData';
import { useNow } from '../hooks/useNow';
import type { ResourceResult } from '../hooks/useResource';
import { useTokenSmartWallets } from '../hooks/useSmartWallets';
import { useTokenDetail } from '../hooks/useTokenDetail';
import { newerCycle } from '../lib/cycle';
import { shortenMint } from '../lib/format';
import { mergeScoreSeries } from '../lib/series';
import { isNetworkError } from '../state/errors';
import { selectCycle } from '../state/cycleFeed';
import { selectScoreHistory } from '../state/liveFeed';
import { useLiveFeedContext } from './LiveFeedProvider';
import { TokenSmartWalletsBody } from './TokenSmartWalletsContainer';

export interface TokenViewContainerProps {
  mint: string;
  /** Where "Back" goes: the list the reader came from. */
  back: { href: string; label: string };
  onBack: () => void;
}

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
        <p className="token-detail__note">Todavía no hay registros. El primero se guarda cuando se crea el token.</p>
      );
    case 'unavailable':
      return (
        <p className="token-detail__note">
          Los registros de este token todavía no están disponibles. Se guardan al crearse, a los 1, 5, 10, 15 y 30
          minutos, y después cada hora, cada día y cada semana mientras se siga operando.
        </p>
      );
    case 'error':
      return (
        <ErrorState
          title={isNetworkError(state.error) ? 'No se pudo conectar con el servidor' : 'No se pudieron cargar los registros'}
          onRetry={retry}
          retryLabel="Reintentar"
        >
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Cargando registros…</LoadingState>;
  }
}

/** The cycle summary on its own clock: it counts every second while the token is stable, and only then. */
function LiveCycleSummary({ cycle }: { cycle: TokenCycle | null }) {
  const now = useNow(cycle?.phase === 'stable' ? 1_000 : 15_000);
  return <CycleSummary cycle={cycle} now={now} />;
}

/** One token as its own view: owns its detail, snapshots, smart wallets and the freshest reading of its cycle. */
export function TokenViewContainer({ mint, back, onBack }: TokenViewContainerProps) {
  const { state: feed, cycles, meta } = useLiveFeedContext();
  const { state, retry } = useTokenDetail(meta.client, mint);
  // Fetched alongside the detail, not after it.
  const snapshots = useTokenSnapshots(meta.client, mint);
  const smartWallets = useTokenSmartWallets(meta.client, mint);
  const now = useNow();
  // Cycle updates from this token's own stream; the live feed and the detail are the other two sources.
  const [streamCycle, setStreamCycle] = useState<TokenCycle | null>(null);
  const onCycle = useCallback((next: TokenCycle) => setStreamCycle((current) => newerCycle(current, next)), []);

  const snapshotData = snapshots.state.status === 'ready' ? snapshots.state.data : null;
  // The live ranking is fresher than the newest snapshot; fall back to the snapshot for tokens off the ranking.
  const liquidity =
    feed.movers.items.find((mover) => mover.mint === mint)?.liquidity ??
    snapshotData?.snapshots.at(-1)?.liquidity ??
    null;
  const live = selectScoreHistory(feed, mint);
  const detail = state.status === 'ready' ? state.data : null;
  const scores = useMemo(() => (detail ? mergeScoreSeries(detail.momentum, live) : []), [detail, live]);
  // Whichever source was updated last. null on a backend that predates cycles: the view works without it.
  const cycle = newerCycle(selectCycle(cycles, mint, detail?.cycle), streamCycle);

  // Move focus to the heading so keyboard and screen reader users land on the token they opened.
  useEffect(() => {
    document.getElementById(TOKEN_VIEW_TITLE_ID)?.focus();
  }, [mint]);

  const short = shortenMint(mint);

  if (!detail) {
    let message;
    if (state.status === 'not-found') {
      message = (
        <>
          <EmptyState title="Este token no está disponible en lessfomo">
            Puede que no lo hayan comprado suficientes wallets que mantienen, que se haya lanzado antes de que el
            screener empezara, o que la dirección no sea de un token de pump.fun.
          </EmptyState>
          <p className="token-view__actions">
            <button type="button" className="button" onClick={onBack}>
              {back.label}
            </button>
          </p>
        </>
      );
    } else if (state.status === 'error') {
      message = (
        <ErrorState
          title={isNetworkError(state.error) ? 'No se pudo conectar con el servidor' : 'No se pudo cargar este token'}
          onRetry={retry}
          retryLabel="Reintentar"
        >
          {state.error.message}
        </ErrorState>
      );
    } else {
      message = <LoadingState>Cargando el token…</LoadingState>;
    }
    return (
      <TokenView
        back={back}
        onBack={onBack}
        title={state.status === 'not-found' ? 'Token no encontrado' : `Token ${short}`}
        subtitle={state.status === 'not-found' ? short : undefined}
      >
        {message}
      </TokenView>
    );
  }

  const symbol = detail.token.symbol || short;
  return (
    <TokenView
      back={back}
      onBack={onBack}
      title={symbol}
      subtitle={detail.token.name}
      chart={
        <Suspense fallback={<LoadingState>Cargando gráfico…</LoadingState>}>
          <TokenChartContainer
            mint={mint}
            symbol={symbol}
            createdAt={detail.token.detectedAt}
            cycle={cycle}
            onCycle={onCycle}
            now={now}
          />
        </Suspense>
      }
      cycle={<LiveCycleSummary cycle={cycle} />}
      details={
        <TokenDetail
          detail={detail}
          scores={scores}
          now={now}
          liquidity={liquidity}
          lifecycle={snapshotData?.lifecycle ?? null}
          smartWallets={<TokenSmartWalletsBody result={smartWallets} now={now} />}
          snapshots={<SnapshotsBody result={snapshots} symbol={symbol} />}
        />
      }
    />
  );
}
