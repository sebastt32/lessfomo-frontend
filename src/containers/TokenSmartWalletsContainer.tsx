import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { SmartWalletItem } from '../components/organisms/SmartWalletItem';
import { SmartWalletsSummary } from '../components/organisms/SmartWalletsSummary';
import type { TokenSmartWalletsResponse } from '../api/types';
import type { ResourceResult } from '../hooks/useResource';
import { isNetworkError } from '../state/errors';
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
          Todavía ninguna wallet con buen historial compró este token. Una wallet tiene buen historial cuando ganó en la
          mayoría de los tokens que operó en los últimos 7 días y terminó con ganancia.
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
          Los datos de wallets todavía no están disponibles: esta API del screener no informa qué wallets con buen
          historial compraron el token. Aparecerán cuando se actualice el backend.
        </p>
      );
    case 'error':
      return (
        <ErrorState
          title={isNetworkError(state.error) ? 'No se pudo conectar con el servidor' : 'No se pudieron cargar las wallets'}
          onRetry={retry}
          retryLabel="Reintentar"
        >
          {state.error.message}
        </ErrorState>
      );
    default:
      return <LoadingState>Cargando wallets…</LoadingState>;
  }
}
