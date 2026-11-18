import { DayNavigator } from '../components/molecules/DayNavigator';
import { Panel } from '../components/molecules/Panel';
import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { DailyRecord } from '../components/organisms/DailyRecord';
import { openToken } from '../hooks/tokenNavigation';
import { useDailyRecord } from '../hooks/useDailyRecord';
import { SMALL_SCREEN, useMediaQuery } from '../hooks/useMediaQuery';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { useNow } from '../hooks/useNow';
import { dayKey, describeRecordDay, describeRecordMonth, parseRecordDay, withRecordDay } from '../lib/dailyRecord';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

/** "Daily record": the tokens that appeared on the day in the URL, and the success of that day and its month. */
export function DailyRecordContainer() {
  const { meta } = useLiveFeedContext();
  const search = useLocationSearch();
  const now = useNow(60_000);
  const today = dayKey(new Date(now));
  const day = parseRecordDay(search, new Date(now));
  const { state, retry } = useDailyRecord(meta.client, day);
  const small = useMediaQuery(SMALL_SCREEN);
  const dayLabel = describeRecordDay(day);

  let body;
  if (state.status === 'ready' || (state.status === 'loading' && state.data !== null)) {
    body = (
      <DailyRecord
        dayLabel={dayLabel}
        monthLabel={describeRecordMonth(day)}
        data={state.data!}
        now={now}
        onSelect={openToken}
        layout={small ? 'cards' : 'table'}
      />
    );
  } else if (state.status === 'error') {
    body = (
      <ErrorState
        title={isNetworkError(state.error) ? 'No se pudo conectar con el servidor' : 'No se pudo cargar el registro diario'}
        onRetry={retry}
      >
        {state.error.message}
      </ErrorState>
    );
  } else {
    body = <LoadingState>Cargando el registro diario…</LoadingState>;
  }

  return (
    <Panel
      id="daily-record"
      title={`Registro diario · ${dayLabel}`}
      description="Todos los tokens que aparecieron en lessfomo ese día, y cuántos llegaron a 2× después de aparecer."
      actions={
        <>
          <DayNavigator day={day} today={today} onChange={(next) => navigate(withRecordDay(search, next, new Date()))} />
          <button type="button" className="button button--quiet" onClick={retry}>
            Actualizar
          </button>
        </>
      }
    >
      {body}
    </Panel>
  );
}
