import { createApiClient, resolveApiUrl } from './api/client';
import { AuthenticatedApp } from './pages/AuthenticatedApp';

// Created once per app load; the base URL comes from VITE_API_URL at build time.
const client = createApiClient({ baseUrl: resolveApiUrl(import.meta.env.VITE_API_URL) });

export function App() {
  return <AuthenticatedApp client={client} />;
}
