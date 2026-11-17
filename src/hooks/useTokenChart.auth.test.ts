import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TokenStreamOptions } from '../api/stream';
import { fakeClient } from '../test/fakeClient';
import { MINT_A } from '../test/fixtures';
import { useTokenChart } from './useTokenChart';

describe('useTokenChart and an expired session', () => {
  it('asks the API for the session when the token stream is rejected, so a 401 signs the app out', () => {
    const client = fakeClient();
    const connect = vi.fn((_options: TokenStreamOptions) => ({ close: vi.fn() }));
    renderHook(() => useTokenChart(client, MINT_A, '1m', { connect }));

    expect(client.getSession).not.toHaveBeenCalled();
    connect.mock.calls[0]?.[0].onRejected?.();
    expect(client.getSession).toHaveBeenCalledTimes(1);
  });
});
