import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { ConnectionState, StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { AppShell } from './AppShell';
import { DashboardPage } from './DashboardPage';
import { fakeClient } from '../test/fakeClient';
import { makeCounts, makeMover, MINT_A, MINT_B } from '../test/fixtures';

const networkError = () => new ApiError(0, 'NETWORK_ERROR', 'Could not reach the lessfomo API at http://api.test.');

function fakeConnect() {
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  return {
    connect,
    setState: (state: ConnectionState) => act(() => options?.onConnectionChange(state)),
    emit: (event: Parameters<StreamOptions['onEvent']>[0]) => act(() => options?.onEvent(event)),
  };
}

function renderPage(client: ApiClient, connect: ReturnType<typeof fakeConnect>['connect']) {
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <DashboardPage />
    </LiveFeedProvider>,
  );
}

/** The live view inside the app shell, which owns the URL: selecting a token opens its own view (S1). */
function renderApp(client: ApiClient, connect: ReturnType<typeof fakeConnect>['connect']) {
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('DashboardPage', () => {
  it('shows a friendly offline state when the backend is not running', async () => {
    const client = fakeClient({
      getHealth: vi.fn(async () => Promise.reject(networkError())),
      getMovers: vi.fn(async () => Promise.reject(networkError())),
      getScreenings: vi.fn(async () => Promise.reject(networkError())),
    });
    const stream = fakeConnect();
    renderPage(client, stream.connect);
    stream.setState('offline');

    expect(await screen.findByText('El servidor de lessfomo no responde')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getAllByText('No se pudo conectar con el servidor')).toHaveLength(2);
    expect(screen.getByText(/no hace que un token dé ganancias/)).toBeInTheDocument();
  });

  it('renders the initial snapshot and replaces movers on a momentum event', async () => {
    const stream = fakeConnect();
    renderPage(fakeClient(), stream.connect);
    stream.setState('connected');

    expect(await screen.findByRole('button', { name: 'Ver detalle de FROG' })).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    const sources = screen.getByLabelText('Fuentes de datos');
    expect(within(sources).getByText('PumpPortal')).toBeInTheDocument();
    expect(sources).toHaveTextContent('PumpPortalconectada');
    expect(sources).toHaveTextContent('Logs de Solanaconectando');

    stream.emit({
      type: 'momentum',
      data: { at: '2026-11-13T20:06:00.000Z', movers: [makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat' })] },
    });
    const table = screen.getByRole('table');
    expect(within(table).getByRole('button', { name: 'Ver detalle de CAT' })).toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Ver detalle de FROG' })).not.toBeInTheDocument();
  });

  it('explains the conviction filter and the safety checks with help marks', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getMovers: vi.fn(async () => ({
        at: '2026-11-13T20:05:00.000Z',
        movers: [makeMover({ smartWallets: makeCounts({ conviction: 4 }) })],
      })),
    });
    renderPage(client, fakeConnect().connect);
    await screen.findByRole('button', { name: 'Ver detalle de FROG' });

    const filter = screen.getByRole('region', { name: 'Filtro de wallets' });
    expect(filter).toHaveTextContent('Mostrando tokens comprados por al menos 3 wallets que mantienen');
    expect(within(filter).getByRole('group', { name: 'Mínimo de wallets que mantienen' })).toBeInTheDocument();
    await user.click(within(filter).getByRole('button', { name: '¿Qué es una wallet que mantiene?' }));
    expect(within(filter).getByRole('note')).toHaveTextContent(/7 días/);

    const checks = screen.getByRole('region', { name: 'Últimos controles de seguridad' });
    await user.click(within(checks).getByRole('button', { name: '¿Qué es un control de seguridad?' }));
    expect(within(checks).getByRole('note')).toHaveTextContent(/no significa que el token vaya a subir/);
  });

  it('reloads the snapshot after the stream recovers from a drop', async () => {
    const client = fakeClient();
    const stream = fakeConnect();
    renderPage(client, stream.connect);
    await screen.findByRole('button', { name: 'Ver detalle de FROG' });
    expect(client.getMovers).toHaveBeenCalledTimes(1);

    stream.setState('connected');
    stream.setState('reconnecting');
    stream.setState('connected');
    expect(client.getMovers).toHaveBeenCalledTimes(2);
    expect(client.getScreenings).toHaveBeenCalledTimes(2);
  });

  // S1: the token detail used to open in a side panel of the live view; it is now a separate view with its own URL.
  it('opens the token in its own view when a row is selected, and comes back with Back', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    expect(window.location.search).toBe(`?view=token&mint=${MINT_A}`);
    expect(client.getToken).toHaveBeenCalledWith(MINT_A, expect.anything());
    expect(await screen.findByRole('heading', { level: 1, name: 'FROG' })).toBeInTheDocument();
    // The lists are gone: the token has the whole page.
    expect(screen.queryByRole('region', { name: 'Más activos ahora' })).not.toBeInTheDocument();
    const view = screen.getByRole('article', { name: 'FROG' });
    // Two stored readings plus the live score seen in the ranking (72 at 20:05).
    expect(
      within(view).getByRole('img', { name: 'Impulso en 3 lecturas, de 40 a 72 sobre 100' }),
    ).toBeInTheDocument();
    expect(within(view).getByText('Historial de controles de seguridad')).toBeInTheDocument();

    await user.click(within(view).getByRole('link', { name: 'Volver a En vivo' }));
    expect(window.location.search).toBe('');
    expect(screen.queryByRole('article', { name: 'FROG' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
  });

  it('shows the live price chart above the safety history in the token view', async () => {
    const client = fakeClient();
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    const view = await screen.findByRole('article', { name: 'FROG' });
    const chart = await within(view).findByRole('img', { name: 'Market cap de FROG en USD, velas de 1m, 2 velas' });
    expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '1m' }));

    const history = within(view).getByText('Historial de controles de seguridad');
    expect(chart.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(within(view).getByRole('button', { name: '5m' }));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '5m' }));
  });

  it('explains a token the API has never seen (404 TOKEN_NOT_FOUND), with a way back', async () => {
    const client = fakeClient({
      getToken: vi.fn(async () => Promise.reject(new ApiError(404, 'TOKEN_NOT_FOUND', 'Token was never seen'))),
    });
    const user = userEvent.setup();
    renderApp(client, fakeConnect().connect);

    await user.click(await screen.findByRole('button', { name: 'Ver detalle de CAT' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Token no encontrado' })).toBeInTheDocument();
    expect(screen.getByText('Este token no está disponible en lessfomo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Volver a En vivo' }));
    expect(window.location.search).toBe('');
    expect(await screen.findByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
  });
});
