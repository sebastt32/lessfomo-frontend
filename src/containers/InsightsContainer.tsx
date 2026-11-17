import { Panel } from '../components/molecules/Panel';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { SmartWalletAnalysis } from '../components/organisms/SmartWalletAnalysis';
import { useSmartWalletAnalysis } from '../hooks/useSmartWallets';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

/** "Does it work?": success by number of good-history wallets, from GET /api/analysis/smart-wallets. */
export function InsightsContainer() {
  const { meta } = useLiveFeedContext();
  const { state, retry } = useSmartWalletAnalysis(meta.client);

  let body;
  switch (state.status) {
    case 'ready':
      body = <SmartWalletAnalysis data={state.data} />;
      break;
    case 'unavailable':
      body = (
        <EmptyState title="Smart-wallet data not available yet">
          This screener API does not have the analysis (GET /api/analysis/smart-wallets) yet. It appears once the
          backend is updated.
        </EmptyState>
      );
      break;
    case 'error':
      body = (
        <ErrorState
          title={isNetworkError(state.error) ? 'Could not reach the screener API' : 'Could not load the analysis'}
          onRetry={retry}
        >
          {state.error.message}
        </ErrorState>
      );
      break;
    default:
      body = <LoadingState>Loading the analysis…</LoadingState>;
  }

  return (
    <Panel
      id="insights"
      title="Does it work?"
      description="How often tokens did well, by how many good-history wallets bought them."
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
