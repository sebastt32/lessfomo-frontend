import { createApiClient, resolveApiUrl } from './api/client';
import { LiveFeedProvider } from './containers/LiveFeedProvider';
import { useLocationSearch } from './hooks/useLocationSearch';
import { parseMinConvictionWallets } from './lib/smartWalletFilter';
import { AppShell } from './pages/AppShell';

// Created once per app load; the base URL comes from VITE_API_URL at build time.
const client = createApiClient({ baseUrl: resolveApiUrl(import.meta.env.VITE_API_URL) });

export function App() {
  // The conviction-wallet threshold lives in the URL and filters the live lists, so the provider reads it.
  const minConvictionWallets = parseMinConvictionWallets(useLocationSearch());
  return (
    <LiveFeedProvider client={client} minConvictionWallets={minConvictionWallets}>
      <AppShell />
    </LiveFeedProvider>
  );
}
