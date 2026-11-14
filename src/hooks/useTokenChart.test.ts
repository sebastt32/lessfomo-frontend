import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient, type CandlesOptions } from '../api/client';
import type { ConnectionState, TokenStreamOptions } from '../api/stream';
import type { CandleInterval, CandlesResponse, TradeView } from '../api/types';
import { makeCandles, makeTrade, MINT_A, MINT_B, T0 } from '../test/fixtures';
import { useTokenChart } from './useTokenChart';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function fakeClient(getCandles: (mint: string, options: CandlesOptions) => Promise<CandlesResponse>) {
  return {
    tokenStreamUrl: (mint: string) => `http://api.test/api/tokens/${mint}/stream`,
    getCandles: vi.fn(getCandles),
  } as unknown as ApiClient & { getCandles: ReturnType<typeof vi.fn> };
}

function fakeConnect() {
  const streams: { options: TokenStreamOptions; close: ReturnType<typeof vi.fn> }[] = [];
  const connect = vi.fn((options: TokenStreamOptions) => {
    const stream = { options, close: vi.fn() };
    streams.push(stream);
    return { close: stream.close };
  });
  const last = () => streams.at(-1)!;
  return {
    connect,
    streams,
    trade: (trade: TradeView) => act(() => last().options.onEvent({ type: 'trade', data: trade })),
    solPrice: (solUsd: number) => act(() => last().options.onEvent({ type: 'sol-price', data: { solUsd } })),
    setState: (state: ConnectionState) => act(() => last().options.onConnectionChange(state)),
  };
}

describe('useTokenChart', () => {
  it('loads candles for the mint and interval, then applies live trades to the forming candle', async () => {
    const client = fakeClient(async () => makeCandles());
    const stream = fakeConnect();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect: stream.connect }));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '1m', limit: 300 }));
    expect(stream.connect).toHaveBeenCalledWith(
      expect.objectContaining({ url: `http://api.test/api/tokens/${MINT_A}/stream` }),
    );
    expect(result.current.candles).toHaveLength(2);
    expect(result.current.totalSupply).toBe(1_000_000_000);
    expect(result.current.solUsd).toBe(140);

    stream.trade(makeTrade({ time: T0 + 70, priceSol: 0.00000009, solAmount: 1 }));
    expect(result.current.candles).toHaveLength(2);
    expect(result.current.candles[1]).toMatchObject({ close: 0.00000009, high: 0.00000009, trades: 3 });

    stream.trade(makeTrade({ time: T0 + 125, isDev: true, side: 'sell', solAmount: 2 }));
    expect(result.current.candles).toHaveLength(3);
    expect(result.current.devTrades.at(-1)).toEqual({ time: T0 + 125, side: 'sell', solAmount: 2 });
  });

  it('applies trades that arrive while the candles are loading once they load', async () => {
    const pending = deferred<CandlesResponse>();
    const client = fakeClient(() => pending.promise);
    const stream = fakeConnect();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect: stream.connect }));

    stream.trade(makeTrade({ time: T0 + 200, priceSol: 0.00000005 }));
    await act(async () => pending.resolve(makeCandles()));

    expect(result.current.status).toBe('ready');
    expect(result.current.candles).toHaveLength(3);
    expect(result.current.candles[2]).toMatchObject({ time: T0 + 180, close: 0.00000005 });
  });

  it('tracks solUsd from sol-price events', async () => {
    const client = fakeClient(async () => makeCandles({ solUsd: null }));
    const stream = fakeConnect();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect: stream.connect }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.solUsd).toBeNull();

    stream.solPrice(151.5);
    expect(result.current.solUsd).toBe(151.5);
  });

  it('reloads on interval change without reopening the stream', async () => {
    const client = fakeClient(async (_mint, { interval }) => makeCandles({ interval }));
    const stream = fakeConnect();
    const { result, rerender } = renderHook(
      ({ interval }: { interval: CandleInterval }) => useTokenChart(client, MINT_A, interval, { connect: stream.connect }),
      { initialProps: { interval: '1m' } },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({ interval: '5m' });
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(client.getCandles).toHaveBeenLastCalledWith(MINT_A, expect.objectContaining({ interval: '5m' }));
    expect(result.current.interval).toBe('5m');
    expect(stream.connect).toHaveBeenCalledTimes(1);
  });

  it('closes the stream when the mint changes and on unmount', async () => {
    const client = fakeClient(async () => makeCandles());
    const stream = fakeConnect();
    const { rerender, unmount } = renderHook(
      ({ mint }: { mint: string }) => useTokenChart(client, mint, '1m', { connect: stream.connect }),
      { initialProps: { mint: MINT_A } },
    );

    rerender({ mint: MINT_B });
    expect(stream.streams[0]?.close).toHaveBeenCalledTimes(1);
    expect(stream.streams[1]?.options.url).toContain(MINT_B);

    unmount();
    expect(stream.streams[1]?.close).toHaveBeenCalledTimes(1);
  });

  it('reports load errors and retries on demand', async () => {
    const client = fakeClient(async () => {
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the lessfomo API.');
    });
    const stream = fakeConnect();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect: stream.connect }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.message).toBe('Could not reach the lessfomo API.');

    client.getCandles.mockResolvedValueOnce(makeCandles());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('refetches in the background after the stream recovers, keeping the chart visible', async () => {
    const client = fakeClient(async () => makeCandles());
    const stream = fakeConnect();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect: stream.connect }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    stream.setState('connected');
    stream.setState('reconnecting');
    expect(result.current.connection).toBe('reconnecting');

    stream.setState('connected');
    expect(result.current.status).toBe('ready');
    await waitFor(() => expect(client.getCandles).toHaveBeenCalledTimes(2));
  });
});
