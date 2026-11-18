import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { WalletResults } from '../components/organisms/WalletResults';
import { useWallet } from '../hooks/useSmartWallets';
import { isNetworkError } from '../state/errors';
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
          Los resultados recientes de esta wallet todavía no están disponibles en esta API del screener.
        </p>
      );
    case 'error':
      return (
        <ErrorState
          title={
            isNetworkError(state.error)
              ? 'No se pudo conectar con el servidor'
              : 'No se pudieron cargar los resultados de esta wallet'
          }
          onRetry={retry}
          retryLabel="Reintentar"
        >
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Cargando resultados recientes…</LoadingState>;
  }
}
