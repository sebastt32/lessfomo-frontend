import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { SmartWalletItem } from '../components/organisms/SmartWalletItem';
import { SmartWalletsSummary } from '../components/organisms/SmartWalletsSummary';
import type { TokenSmartWalletsResponse } from '../api/types';
import type { ResourceResult } from '../hooks/useResource';
import { WalletResultsContainer } from './WalletResultsContainer';

export interface TokenSmartWalletsBodyProps {
  /** From useTokenSmartWallets, started by the detail container alongside the token detail. */
  result: ResourceResult<TokenSmartWalletsResponse>;
  now: number;
}

/** The token detail's "Smart wallets" section: who bought it and why their record is good. */
export function TokenSmartWalletsBody({ result, now }: TokenSmartWalletsBodyProps) {
  const { state, retry } = result;
  switch (state.status) {
    case 'ready':
      return state.data.smartWallets.length === 0 ? (
        <p className="token-detail__note">
          No good-history wallet has bought this token yet. A wallet counts as good when it won most of the tokens it
          traded in the last 7 days with a net profit.
        </p>
      ) : (
        <SmartWalletsSummary wallets={state.data.smartWallets}>
          {state.data.smartWallets.map((wallet) => (
            <SmartWalletItem key={wallet.address} wallet={wallet}>
              <WalletResultsContainer address={wallet.address} now={now} />
            </SmartWalletItem>
          ))}
        </SmartWalletsSummary>
      );
    case 'unavailable':
      return (
        <p className="token-detail__note">
          Smart-wallet data not available yet: this screener API does not report which good-history wallets bought
          the token. It appears once the backend is updated.
        </p>
      );
    case 'error':
      return (
        <ErrorState title="Could not load smart wallets" onRetry={retry}>
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Loading smart wallets…</LoadingState>;
  }
}
