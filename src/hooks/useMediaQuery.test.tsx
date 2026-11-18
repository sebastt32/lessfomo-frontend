import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { SMALL_SCREEN, useMediaQuery } from './useMediaQuery';

afterEach(() => vi.unstubAllGlobals());

describe('useMediaQuery', () => {
  it('follows the media query', () => {
    stubMatchMedia(true);
    expect(renderHook(() => useMediaQuery(SMALL_SCREEN)).result.current).toBe(true);
    stubMatchMedia(false);
    expect(renderHook(() => useMediaQuery(SMALL_SCREEN)).result.current).toBe(false);
  });

  it('is false where matchMedia does not exist', () => {
    expect(renderHook(() => useMediaQuery(SMALL_SCREEN)).result.current).toBe(false);
  });
});
