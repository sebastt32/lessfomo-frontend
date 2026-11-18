import { HelpTip } from '../components/molecules/HelpTip';
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
    body = <LoadingState>Cargando los últimos controles de seguridad…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState
        title={isNetworkError(error) ? 'No se pudo conectar con el servidor' : 'No se pudieron cargar los controles de seguridad'}
        onRetry={actions.reload}
      >
        {error?.message}
      </ErrorState>
    );
  } else if (visible.filtered && status === 'ready') {
    body = (
      <EmptyState title="Todavía ningún control de seguridad pasa el filtro de wallets que mantienen">
        {describeConvictionFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} ${visible.hidden === 1 ? 'control reciente está oculto' : 'controles recientes están ocultos'} porque muy pocas wallets que mantienen compraron esos tokens. `
          : ''}
        Los tokens aparecen aquí apenas los compran suficientes wallets que mantienen. Baja el mínimo de arriba para ver
        más.
      </EmptyState>
    );
  } else {
    body = (
      <EmptyState title="Todavía no hay controles de seguridad">
        Los tokens nuevos se revisan poco después de lanzarse. Los resultados aparecen aquí al terminar.
      </EmptyState>
    );
  }

  return (
    <Panel
      id="screenings"
      title="Últimos controles de seguridad"
      description={
        <>
          Cuánto tienen los mayores holders y el creador, y los permisos del token, del más nuevo al más antiguo.
          <HelpTip topic="un control de seguridad">
            Revisa cuánto tienen los 10 mayores holders, cuánto tiene el creador y los permisos del token. Pasarlo no
            significa que el token vaya a subir.
          </HelpTip>
        </>
      }
    >
      {body}
    </Panel>
  );
}
