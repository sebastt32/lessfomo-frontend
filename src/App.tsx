import { createApiClient, resolveApiUrl } from './api/client';
import { LiveFeedProvider } from './containers/LiveFeedProvider';
import { useLocationSearch } from './hooks/useLocationSearch';
import { parseMinSmartWallets } from './lib/smartWalletFilter';
import { AppShell } from './pages/AppShell';

// Created once per app load; the base URL comes from VITE_API_URL at build time.
const client = createApiClient({ baseUrl: resolveApiUrl(import.meta.env.VITE_API_URL) });

export function App() {
  // The smart-wallet threshold lives in the URL and filters the live lists, so the provider reads it.
  const minSmartWallets = parseMinSmartWallets(useLocationSearch());
  return (
    <LiveFeedProvider client={client} minSmartWallets={minSmartWallets}>
      <AppShell />
    </LiveFeedProvider>
  );
}
