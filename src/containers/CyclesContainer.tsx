import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { CyclesAnalysis } from '../components/organisms/CyclesAnalysis';
import { useCyclesAnalysis } from '../hooks/useCycles';
import { CYCLE_UNAVAILABLE } from '../lib/cycle';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

/** "Cycles": how long tokens could be bought after appearing, and what happened next (GET /api/analysis/cycles). */
export function CyclesContainer() {
  const { meta } = useLiveFeedContext();
  const { state, retry } = useCyclesAnalysis(meta.client);

  let body;
  switch (state.status) {
    case 'ready':
      body = <CyclesAnalysis data={state.data} />;
      break;
    case 'unavailable':
      body = (
        <EmptyState title={CYCLE_UNAVAILABLE}>
          This screener API does not have the cycles analysis (GET /api/analysis/cycles) yet. It appears once the
          backend is updated.
        </EmptyState>
      );
      break;
    case 'error':
      body = (
        <ErrorState
          title={isNetworkError(state.error) ? 'Could not reach the screener API' : 'Could not load the cycles'}
          onRetry={retry}
        >
          {state.error.message}
        </ErrorState>
      );
      break;
    default:
      body = <LoadingState>Loading the cycles…</LoadingState>;
  }

  return (
    <Panel
      id="cycles"
      title="Cycles"
      description="How long tokens could be bought after appearing in lessfomo, and what happened next."
      actions={
        <button type="button" className="button button--quiet" onClick={retry}>
          Refresh
        </button>
      }
    >
      {body}
    </Panel>
  );
}
