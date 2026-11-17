import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { WalletResults } from '../components/organisms/WalletResults';
import { useWallet } from '../hooks/useSmartWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface WalletResultsContainerProps {
  address: string;
  now: number;
}

/** Loads GET /api/wallets/:address when mounted (the wallet's results were expanded). */
export function WalletResultsContainer({ address, now }: WalletResultsContainerProps) {
  const { meta } = useLiveFeedContext();
  const { state, retry } = useWallet(meta.client, address);
  switch (state.status) {
    case 'ready':
      return <WalletResults results={state.data.results} now={now} />;
    case 'unavailable':
      return (
        <p className="smart-wallets__note">
          This wallet's recent results are not available yet on this screener API.
        </p>
      );
    case 'error':
      return (
        <ErrorState title="Could not load this wallet's results" onRetry={retry}>
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Loading recent results…</LoadingState>;
  }
}
