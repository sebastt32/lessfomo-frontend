import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../api/client';
import type { StreamOptions } from '../api/stream';
import { LiveFeedProvider } from '../containers/LiveFeedProvider';
import { fakeClient } from '../test/fakeClient';
import {
  makeCounts,
  makeMover,
  makeScreening,
  makeSmartWallet,
  makeWalletRecord,
  makeWalletResponse,
  makeWalletResult,
  MINT_A,
  MINT_B,
  WALLET_A,
  WALLET_B,
} from '../test/fixtures';
import { AppShell } from './AppShell';

const MINT_DOG = 'So11111111111111111111111111111111111111112';
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Route not found');

function renderApp(client: ApiClient, url = '/', minConvictionWallets?: number) {
  window.history.replaceState(null, '', url);
  let options: StreamOptions | null = null;
  const connect = vi.fn((opts: StreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  const view = render(
    <LiveFeedProvider client={client} connect={connect} {...(minConvictionWallets ? { minConvictionWallets } : {})}>
      <AppShell />
    </LiveFeedProvider>,
  );
  return {
    ...view,
    emit: (event: Parameters<StreamOptions['onEvent']>[0]) => act(() => options?.onEvent(event)),
  };
}

/** The conviction filter bar, found through its control group (the glossary's label). */
const filterBar = () =>
  screen.getByRole('group', { name: 'Mínimo de wallets que mantienen' }).closest('section')!;

const smartMovers = () =>
  fakeClient({
    getMovers: vi.fn(async () => ({
      at: '2026-11-13T20:05:00.000Z',
      movers: [
        makeMover({ mint: MINT_A, symbol: 'FROG', smartWallets: makeCounts({ count: 7, elite: 1, holding: 2, conviction: 3 }) }),
        // Plenty of good wallets, but they are flippers: not enough conviction wallets.
        makeMover({ mint: MINT_B, symbol: 'CAT', name: 'Cat', smartWallets: makeCounts({ count: 9, elite: 0, holding: 0, conviction: 1 }) }),
      ],
    })),
    // The server only returns safety checks of tokens that pass the threshold.
    getScreenings: vi.fn(async () => ({ screenings: [makeScreening({ mint: MINT_DOG, symbol: 'DOG' })] })),
  });

afterEach(() => window.history.replaceState(null, '', '/'));

/** The explanation a "?" button opened (it controls it while open). */
const bubbleOf = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls') ?? '');

// S7/D7: the filter moved from good-history wallets (default 5) to conviction wallets (default 3).
describe('conviction-wallet filter in the live view', () => {
  it('shows only tokens bought by at least three conviction wallets by default, and says so', async () => {
    const client = smartMovers();
    renderApp(client);

    expect(await screen.findByRole('button', { name: 'Ver detalle de FROG' })).toBeInTheDocument();
    const movers = screen.getByRole('region', { name: 'Más activos ahora' });
    expect(within(movers).queryByRole('button', { name: 'Ver detalle de CAT' })).not.toBeInTheDocument();
    const bar = filterBar();
    expect(bar).toHaveTextContent('Mostrando tokens comprados por al menos 3 wallets que mantienen');
    expect(bar).toHaveTextContent(/venden? rápido/i);
    const group = screen.getByRole('group', { name: 'Mínimo de wallets que mantienen' });
    expect(within(group).getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['3', '5', '10+']);
    expect(client.getMovers).toHaveBeenCalledWith(expect.objectContaining({ minConvictionWallets: 3 }));
    expect(client.getScreenings).toHaveBeenCalledWith(expect.objectContaining({ minConvictionWallets: 3 }));
    expect(client.getMovers).not.toHaveBeenCalledWith(expect.objectContaining({ minSmartWallets: expect.anything() }));

    const table = screen.getByRole('table');
    expect(within(table).getByRole('button', { name: 'Ver detalle de FROG' }).closest('tr')).toHaveTextContent(/3.*7.*2/);
    const feed = screen.getByRole('region', { name: 'Últimos controles de seguridad' });
    expect(within(feed).getByRole('button', { name: 'Ver detalle de DOG' })).toBeInTheDocument();
  });

  it('changes the minimum, keeps it in the URL and explains an empty list', async () => {
    const user = userEvent.setup();
    renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Ver detalle de FROG' });

    await user.click(screen.getByRole('button', { name: '5' }));
    expect(window.location.search).toBe('?minConvictionWallets=5');
    expect(filterBar()).toHaveTextContent('Mostrando tokens comprados por al menos 5 wallets que mantienen');
    const movers = screen.getByRole('region', { name: 'Más activos ahora' });
    expect(within(movers).queryByRole('button', { name: /^Ver detalle de/ })).not.toBeInTheDocument();
    // The empty list says why: 2 ranked tokens were not bought by enough wallets que mantienen.
    expect(movers).toHaveTextContent(/2 tokens/);
    expect(movers).toHaveTextContent(/wallets que mantienen/);

    await user.click(screen.getByRole('button', { name: '10+' }));
    expect(window.location.search).toBe('?minConvictionWallets=10');
  });

  it('refetches movers and safety checks when the threshold changes', async () => {
    const client = smartMovers();
    const connect = vi.fn((_options: StreamOptions) => ({ close: vi.fn() }));
    const { rerender } = render(
      <LiveFeedProvider client={client} connect={connect} minConvictionWallets={3}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await screen.findByRole('button', { name: 'Ver detalle de FROG' });
    rerender(
      <LiveFeedProvider client={client} connect={connect} minConvictionWallets={10}>
        <AppShell />
      </LiveFeedProvider>,
    );
    await waitFor(() =>
      expect(client.getMovers).toHaveBeenLastCalledWith(expect.objectContaining({ minConvictionWallets: 10 })),
    );
    expect(client.getScreenings).toHaveBeenLastCalledWith(expect.objectContaining({ minConvictionWallets: 10 }));
    // The stream is not reopened for a new threshold.
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('shows the server list unfiltered and explains it when the backend does not report conviction yet', async () => {
    renderApp(
      fakeClient({
        getMovers: vi.fn(async () => ({
          at: '2026-11-13T20:05:00.000Z',
          movers: [makeMover({ mint: MINT_A, symbol: 'FROG', smartWallets: { count: 6, elite: 1, holding: 1 } })],
        })),
      }),
    );
    expect(await screen.findByRole('button', { name: 'Ver detalle de FROG' })).toBeInTheDocument();
    expect(filterBar()).toHaveTextContent(/todavía no/i);
    expect(filterBar()).not.toHaveTextContent('Mostrando tokens comprados por al menos');
    expect(within(screen.getByRole('table')).getByText(/^6 /)).toBeInTheDocument();
  });

  it('adds a token once a smart-wallet event pushes it over the threshold', async () => {
    const app = renderApp(smartMovers());
    await screen.findByRole('button', { name: 'Ver detalle de FROG' });
    app.emit({
      type: 'smart-wallet',
      data: { mint: MINT_B, smartWallets: makeCounts({ count: 9, elite: 0, holding: 1, conviction: 3 }), wallet: makeSmartWallet() },
    });
    const movers = screen.getByRole('region', { name: 'Más activos ahora' });
    expect(within(movers).getByRole('button', { name: 'Ver detalle de CAT' })).toBeInTheDocument();
  });

  it('shows every token and says why when the backend has no smart-wallet data', async () => {
    renderApp(fakeClient());
    expect(await screen.findByRole('button', { name: 'Ver detalle de FROG' })).toBeInTheDocument();
    expect(filterBar()).toHaveTextContent(/todavía no/i);
    expect(filterBar()).not.toHaveTextContent('Mostrando tokens comprados por al menos');
  });
});

describe('token detail: smart wallets', () => {
  it('lists each good-history wallet and explains its record, loading recent results on demand', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getTokenSmartWallets: vi.fn(async () => ({
        mint: MINT_A,
        smartWallets: [
          makeSmartWallet({
            tierAtEntry: 'good',
            record: makeWalletRecord({ tier: 'elite', isBot: true }),
            entrySeconds: 3,
            boughtSol: 1.5,
            stillHolding: true,
          }),
        ],
      })),
      getWallet: vi.fn(async () =>
        makeWalletResponse({ results: [makeWalletResult({ symbol: 'CAT', pnlSol: 1.5 })] }),
      ),
    });
    renderApp(client);
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));

    const section = await screen.findByRole('region', { name: 'Wallets con buen historial' });
    expect(await within(section).findByText(/1 wallet con buen historial/)).toBeInTheDocument();
    expect(section).toHaveTextContent(
      'Por qué tiene buen historial: Ganó en 9 de 12 tokens (75%) en los últimos 7 días, resultado neto +14.24 SOL, suele comprar 4 s después del lanzamiento.',
    );
    expect(section).toHaveTextContent('Compró 1.50 SOL 3 s después del lanzamiento, todavía lo tiene.');
    expect(within(section).getByText('Al comprar: Buen historial')).toBeInTheDocument();
    expect(within(section).getByText('Ahora: Élite')).toBeInTheDocument();
    expect(within(section).getByText('Bot')).toBeInTheDocument();
    expect(section).toHaveTextContent('Los resultados pasados no garantizan los futuros');
    expect(section).toHaveTextContent('solo cubre los tokens que lessfomo observó');
    // This backend predates trading styles: no style badges, and the section says so.
    expect(within(section).queryByText(/^Estilo al comprar/)).not.toBeInTheDocument();
    expect(section).toHaveTextContent('Todavía no está disponible el estilo de operación');

    const solscan = within(section).getByRole('link', { name: /en Solscan/ });
    expect(solscan).toHaveAttribute('href', `https://solscan.io/account/${WALLET_A}`);
    expect(solscan).toHaveAttribute('target', '_blank');
    expect(solscan).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(section).getByRole('button', { name: `Copiar la dirección de la wallet ${WALLET_A}` })).toBeInTheDocument();

    expect(client.getWallet).not.toHaveBeenCalled();
    await user.click(within(section).getByRole('button', { name: 'Ver resultados recientes' }));
    expect(client.getWallet).toHaveBeenCalledWith(WALLET_A, expect.anything());
    const results = await within(section).findByRole('region', { name: 'Resultados recientes' });
    expect(within(results).getByRole('rowheader', { name: 'CAT' })).toBeInTheDocument();
    expect(results).toHaveTextContent('+1.50 SOL');
  });

  it('shows each wallet\'s style at entry and now, its holding behavior, and what conviction vs flipper means', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getTokenSmartWallets: vi.fn(async () => ({
        mint: MINT_A,
        smartWallets: [
          makeSmartWallet({
            styleAtEntry: 'conviction',
            record: makeWalletRecord({ style: 'mixed', medianHoldSeconds: 840, flipRate: 12 }),
          }),
          makeSmartWallet({
            address: WALLET_B,
            tierAtEntry: 'elite',
            styleAtEntry: 'flipper',
            stillHolding: false,
            soldSol: 2,
            record: makeWalletRecord({ address: WALLET_B, style: 'flipper', medianHoldSeconds: 40, flipRate: 82 }),
          }),
        ],
      })),
    });
    renderApp(client);
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    const section = await screen.findByRole('region', { name: 'Wallets con buen historial' });

    expect(await within(section).findByText('1 wallet que mantiene')).toBeInTheDocument();
    // The "?" help buttons sit between the words, so the sentence is checked in pieces.
    const headline = within(section).getByText('1 wallet que mantiene').closest('p')!;
    expect(headline).toHaveTextContent('de 2 wallets con buen historial que compraron este token (1 vende rápido');
    expect(headline).toHaveTextContent(', 1 élite al comprar); 1 todavía lo tiene.');
    expect(within(section).getByText('Estilo al comprar: Mantiene')).toBeInTheDocument();
    expect(within(section).getByText('Estilo ahora: Mixta')).toBeInTheDocument();
    expect(within(section).getByText('Estilo al comprar: Vende rápido')).toBeInTheDocument();
    expect(within(section).getByText('Estilo ahora: Vende rápido')).toBeInTheDocument();
    expect(section).toHaveTextContent(
      'suele comprar 4 s después del lanzamiento, suele mantener 14 min; vendió antes de 2 min en el 12% de sus tokens.',
    );
    expect(section).toHaveTextContent('suele mantener 40 s; vendió antes de 2 min en el 82% de sus tokens.');
    const note = within(section).getByText(/Mantiene o vende rápido/).closest('p');
    expect(note).toHaveTextContent('las que venden rápido se muestran aquí pero nunca cuentan');
    expect(note).toHaveTextContent('comprar justo después de ellas suele significar comprarles lo que están vendiendo');
    expect(note).toHaveTextContent('al menos 3');
  });

  it('explains wallets que mantienen, vende rápido and the trading style with a "?"', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      getTokenSmartWallets: vi.fn(async () => ({
        mint: MINT_A,
        smartWallets: [makeSmartWallet({ styleAtEntry: 'conviction', record: makeWalletRecord({ style: 'conviction' }) })],
      })),
    });
    renderApp(client);
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    const section = await screen.findByRole('region', { name: 'Wallets con buen historial' });
    await within(section).findByText('1 wallet que mantiene');

    const holds = within(section).getByRole('button', { name: '¿Qué es una wallet que mantiene?' });
    await user.click(holds);
    expect(holds).toHaveAttribute('aria-expanded', 'true');
    expect(bubbleOf(holds)).toHaveTextContent('suele quedarse con lo que compra');

    const flips = within(section).getByRole('button', { name: '¿Qué es una wallet que vende rápido?' });
    await user.click(flips);
    expect(bubbleOf(flips)).toHaveTextContent('antes de 2 minutos');
    expect(within(section).getByRole('button', { name: '¿Qué es el estilo?' })).toBeInTheDocument();
  });

  it('says smart-wallet data is not available yet on an older backend', async () => {
    const user = userEvent.setup();
    renderApp(fakeClient({ getTokenSmartWallets: vi.fn(async () => Promise.reject(notFound())) }));
    await user.click(await screen.findByRole('button', { name: 'Ver detalle de FROG' }));
    const section = await screen.findByRole('region', { name: 'Wallets con buen historial' });
    expect(await within(section).findByText(/Los datos de wallets todavía no están disponibles/)).toBeInTheDocument();
  });
});
