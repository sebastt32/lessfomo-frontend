import { Panel } from '../components/molecules/Panel';
import { SegmentedControl } from '../components/molecules/SegmentedControl';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { SmartWalletAnalysis } from '../components/organisms/SmartWalletAnalysis';
import { useAnalysisBy } from '../hooks/useAnalysisBy';
import { useSmartWalletAnalysis } from '../hooks/useSmartWallets';
import { analysisGrouping } from '../lib/smartWallets';
import type { AnalysisBy } from '../lib/smartWalletFilter';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

const BY_OPTIONS: { value: AnalysisBy; label: string }[] = [
  { value: 'smartWallets', label: 'Good wallets' },
  { value: 'conviction', label: 'Conviction wallets' },
];

const UNSUPPORTED_CONVICTION =
  'This screener API does not group the analysis by conviction wallets yet, so it shows the grouping by good-history wallets instead. It appears once the backend is updated.';

/** "Does it work?": success by number of good-history or conviction wallets, from GET /api/analysis/smart-wallets. */
export function InsightsContainer() {
  const { meta } = useLiveFeedContext();
  const [by, setBy] = useAnalysisBy();
  const { state, retry } = useSmartWalletAnalysis(meta.client, by);

  let body;
  switch (state.status) {
    case 'ready': {
      const answered = analysisGrouping(state.data);
      body = (
        <>
          {by === 'conviction' && answered !== 'conviction' ? (
            <p className="analysis__note" role="note">
              {UNSUPPORTED_CONVICTION}
            </p>
          ) : null}
          <SmartWalletAnalysis data={state.data} by={answered} />
        </>
      );
      break;
    }
    case 'unavailable':
      body = (
        <EmptyState title="Smart-wallet data not available yet">
          This screener API does not have the analysis (GET /api/analysis/smart-wallets) yet. It appears once the
          backend is updated.
        </EmptyState>
      );
      break;
    case 'error':
      body =
        by === 'conviction' && state.error.code === 'INVALID_QUERY' ? (
          <ErrorState title="Conviction grouping not available yet" onRetry={() => setBy('smartWallets')} retryLabel="Show good wallets">
            This screener API does not group the analysis by conviction wallets yet. It appears once the backend is
            updated.
          </ErrorState>
        ) : (
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
      description={
        by === 'conviction'
          ? 'How often tokens did well, by how many conviction wallets bought them.'
          : 'How often tokens did well, by how many good-history wallets bought them.'
      }
      actions={
        <div className="analysis__actions">
          <SegmentedControl<AnalysisBy> label="Group the analysis by" value={by} options={BY_OPTIONS} onChange={setBy} />
          <button type="button" className="button button--quiet" onClick={retry}>
            Refresh
          </button>
        </div>
      }
    >
      {body}
    </Panel>
  );
}
