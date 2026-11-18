import { useMemo } from 'react';
import { HelpTip } from '../components/molecules/HelpTip';
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

  // The table explains the score in its column header; the cards have no headers, so the description does.
  const description = (
    <>
      Ordenados por impulso
      {small ? (
        <HelpTip topic="el impulso">
          Un puntaje de 0 a 100 que mide qué tan rápido crecen los compradores nuevos y el volumen de compra en los
          últimos minutos.
        </HelpTip>
      ) : null}
      {at ? `. Actualizado ${formatRelativeTime(at, now)}; se actualiza cada minuto.` : '. Se actualiza cada minuto.'}
    </>
  );

  let body;
  if (items.length > 0) {
    body = small ? (
      <MoverCards movers={items} onSelect={onSelect} now={now} />
    ) : (
      <MoversTable movers={items} onSelect={onSelect} now={now} />
    );
  } else if (status === 'loading') {
    body = <LoadingState>Cargando los más activos…</LoadingState>;
  } else if (status === 'error') {
    body = (
      <ErrorState
        title={isNetworkError(error) ? 'No se pudo conectar con el servidor' : 'No se pudo cargar la lista de más activos'}
        onRetry={actions.reload}
      >
        {error?.message}
      </ErrorState>
    );
  } else if (visible.filtered && (visible.hidden > 0 || (status === 'ready' && at !== null))) {
    body = (
      <EmptyState title="Ahora ningún token activo pasa el filtro de wallets que mantienen">
        {describeConvictionFilter(min)}.{' '}
        {visible.hidden > 0
          ? `${visible.hidden} ${visible.hidden === 1 ? 'token de la lista no fue comprado' : 'tokens de la lista no fueron comprados'} por suficientes wallets que mantienen. `
          : 'Ningún token de la lista fue comprado por suficientes wallets que mantienen. '}
        Baja el mínimo de arriba o espera la próxima actualización, en un minuto.
      </EmptyState>
    );
  } else {
    body = (
      <EmptyState title="Todavía no hay tokens activos">
        {at === null
          ? 'La primera lista se publica un minuto después de que arranca el screener.'
          : 'Ahora ningún token tiene suficiente actividad. La lista se actualiza cada minuto.'}
      </EmptyState>
    );
  }

  return (
    <Panel id="movers" title="Más activos ahora" description={description}>
      {body}
    </Panel>
  );
}
