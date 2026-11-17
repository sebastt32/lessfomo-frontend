import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../api/client';
import type { TokenStreamOptions } from '../api/stream';
import { makeCandles, makeCycle, makeTrade, MINT_A, MINT_B, T0 } from '../test/fixtures';
import { useTokenChart } from './useTokenChart';

function setup() {
  const client = {
    tokenStreamUrl: (mint: string) => `/api/tokens/${mint}/stream`,
    getCandles: vi.fn(async () => makeCandles()),
  } as unknown as ApiClient & { getCandles: ReturnType<typeof vi.fn> };
  let options: TokenStreamOptions | null = null;
  const connect = vi.fn((opts: TokenStreamOptions) => {
    options = opts;
    return { close: vi.fn() };
  });
  return { client, connect, emit: (event: Parameters<TokenStreamOptions['onEvent']>[0]) => act(() => options!.onEvent(event)) };
}

describe('useTokenChart: cycle events', () => {
  it('hands cycle events of this token to onCycle and leaves the candles alone', async () => {
    const { client, connect, emit } = setup();
    const onCycle = vi.fn();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect, onCycle }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const before = result.current.candles;

    const cycle = makeCycle();
    emit({ type: 'cycle', data: { mint: MINT_A, cycle } });
    expect(onCycle).toHaveBeenCalledExactlyOnceWith(cycle);
    expect(result.current.candles).toBe(before);
    expect(result.current.solUsd).toBe(140);

    // Trades keep working after a cycle event.
    emit({ type: 'trade', data: makeTrade({ time: T0 + 70 }) });
    expect(result.current.candles[1]?.trades).toBe(3);
  });

  it('ignores cycle events of another token or without a cycle', async () => {
    const { client, connect, emit } = setup();
    const onCycle = vi.fn();
    const { result } = renderHook(() => useTokenChart(client, MINT_A, '1m', { connect, onCycle }));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    emit({ type: 'cycle', data: { mint: MINT_B, cycle: makeCycle() } });
    emit({ type: 'cycle', data: { mint: MINT_A } as never });
    expect(onCycle).not.toHaveBeenCalled();
  });

  it('asks for the requested number of candles and the new intervals', async () => {
    const { client, connect } = setup();
    renderHook(() => useTokenChart(client, MINT_A, '15m', { connect, limit: 1500 }));
    await waitFor(() =>
      expect(client.getCandles).toHaveBeenCalledWith(MINT_A, expect.objectContaining({ interval: '15m', limit: 1500 })),
    );
  });
});
