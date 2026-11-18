import type { ReactNode } from 'react';
import type { ApiClient } from '../api/client';
import { ErrorState, LoadingState } from '../components/molecules/SectionState';
import { AccountContainer } from '../containers/AccountContainer';
import { AuthProvider, useAuth } from '../containers/AuthProvider';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import type { ConnectFn } from '../hooks/useLiveFeed';
import { useLocationSearch } from '../hooks/useLocationSearch';
import { parseMinConvictionWallets } from '../lib/smartWalletFilter';
import { AppShell } from './AppShell';
import { LoginPage, SessionPage } from './LoginPage';

export interface AuthenticatedAppProps {
  client: ApiClient;
  /** Overrides the live SSE connection (tests). */
  connect?: ConnectFn;
}

/** The whole site behind a login: the platform only exists while somebody is signed in. */
export function AuthenticatedApp({ client, connect }: AuthenticatedAppProps) {
  return (
    <AuthProvider client={client}>
      <AuthGate connect={connect} />
    </AuthProvider>
  );
}

function AuthGate({ connect }: { connect: ConnectFn | undefined }) {
  const { state, actions, meta } = useAuth();
  switch (state.status) {
    case 'checking':
      return (
        <SessionPage>
          <LoadingState>Comprobando tu sesión…</LoadingState>
        </SessionPage>
      );
    case 'unreachable':
      return (
        <SessionPage>
          <ErrorState title="No se puede conectar con el servidor" onRetry={actions.retry} retryLabel="Reintentar">
            El servidor no respondió. Revisa tu conexión e inténtalo de nuevo.
          </ErrorState>
        </SessionPage>
      );
    case 'signedOut':
      return <LoginPage />;
    case 'signedIn':
      // Mounted only while signed in: signing out unmounts it, so no data, request or stream outlives the session.
      return <Platform client={meta.client} connect={connect} account={<AccountContainer />} />;
    case 'unavailable':
      // A backend without authentication: the platform as it was before logins existed.
      return <Platform client={meta.client} connect={connect} />;
  }
}

interface PlatformProps {
  client: ApiClient;
  connect: ConnectFn | undefined;
  account?: ReactNode;
}

function Platform({ client, connect, account }: PlatformProps) {
  // The conviction-wallet threshold lives in the URL and filters the live lists, so the provider reads it.
  const minConvictionWallets = parseMinConvictionWallets(useLocationSearch());
  return (
    <LiveFeedProvider
      client={client}
      minConvictionWallets={minConvictionWallets}
      {...(connect ? { connect } : {})}
    >
      <AppShell account={account} />
    </LiveFeedProvider>
  );
}
