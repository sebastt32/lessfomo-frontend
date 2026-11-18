import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import { makeMover } from '../test/fixtures';
import { stubMatchMedia } from '../test/matchMedia';
import { AppShell } from './AppShell';

const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route not found');

function renderApp(client: ApiClient, url = '/') {
  window.history.replaceState(null, '', url);
  const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
  return render(
    <LiveFeedProvider client={client} connect={connect}>
      <AppShell />
    </LiveFeedProvider>,
  );
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('AppShell navigation', () => {
  it('switches between the live view and the daily record, keeping the view in the URL', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderApp(client);

    const nav = screen.getByRole('navigation', { name: 'Vistas' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual(['En vivo', 'Registro diario']);
    expect(within(nav).getByRole('link', { name: 'En vivo' })).toHaveAttribute('aria-current', 'page');
    expect(await screen.findByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();

    await user.click(within(nav).getByRole('link', { name: 'Registro diario' }));
    expect(window.location.search).toBe('?view=record');
    expect(await screen.findByRole('region', { name: /^Registro diario · / })).toBeInTheDocument();
    const recordNav = screen.getByRole('navigation', { name: 'Vistas' });
    expect(within(recordNav).getByRole('link', { name: 'Registro diario' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(recordNav).getByRole('link', { name: 'En vivo' }));
    expect(window.location.search).toBe('');
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
  });

  it('opens Live for the old History and Insights links', async () => {
    for (const view of ['history', 'insights']) {
      const { unmount } = renderApp(fakeClient(), `/?view=${view}&page=2`);
      expect(await screen.findByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'En vivo' })).toHaveAttribute('aria-current', 'page');
      unmount();
    }
  });

  it('shows the database totals in the header of both views', async () => {
    const client = fakeClient();
    renderApp(client);
    const totals = await screen.findByRole('region', { name: 'Totales del screener' });
    expect(totals).toHaveTextContent('1,234 tokens seguidos desde');
    expect(totals).toHaveTextContent('Activos210');
    expect(totals).toHaveTextContent('Graduados3');
    expect(totals).toHaveTextContent('Pendientes214');
    expect(totals).toHaveTextContent('Operaciones456,789');
    expect(totals).toHaveTextContent('Registros?23,456');
  });

  it('explains what a snapshot is from the header totals', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient());
    const totals = await screen.findByRole('region', { name: 'Totales del screener' });
    await user.click(within(totals).getByRole('button', { name: '¿Qué es un registro?' }));
    expect(within(totals).getByRole('note')).toHaveTextContent(/momentos clave/);
  });

  it('keeps the live view working on a backend without the new endpoints', async () => {
    const client = fakeClient({
      getStats: vi.fn(async () => Promise.reject(notFound())),
      getTokenSnapshots: vi.fn(async () => Promise.reject(new ApiError(400, 'INVALID_MINT', 'Mint is not a base58 address'))),
      // An old backend sends movers without liquidity.
      getMovers: vi.fn(async () => {
        const { liquidity: _drop, ...mover } = makeMover();
        return { at: '2026-11-13T20:05:00.000Z', movers: [mover] };
      }),
    });
    const user = userEvent.setup();
    renderApp(client);

    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    // S1: the token opens in its own view instead of a side panel.
    const panel = await screen.findByRole('article', { name: 'FROG' });
    expect(await within(panel).findByText(/Los registros de este token todavía no están disponibles/)).toBeInTheDocument();
    expect(within(panel).getByText('Todavía no hay datos de liquidez de este token.')).toBeInTheDocument();
    await waitFor(() => expect(client.getStats).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Totales del screener' })).not.toBeInTheDocument();
  });
});

describe('small screens', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows cards instead of tables in Live and in the daily record', async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderApp(fakeClient());

    const movers = await screen.findByRole('list', { name: 'Más activos ahora' });
    expect(within(movers).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Registro diario' }));
    expect(await screen.findByRole('list', { name: /^Tokens del / })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('first-visit guide', () => {
  it('opens by itself the first time, stays closed once finished, and opens again from "Guía"', async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    const first = renderApp(fakeClient());

    const guide = await screen.findByRole('dialog', { name: 'Bienvenido a lessfomo' });
    expect(guide).toHaveTextContent('Paso 1 de 4');
    await user.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    first.unmount();

    renderApp(fakeClient());
    expect(await screen.findByRole('navigation', { name: 'Vistas' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guía' }));
    expect(screen.getByRole('dialog', { name: 'Bienvenido a lessfomo' })).toBeInTheDocument();
  });
});
