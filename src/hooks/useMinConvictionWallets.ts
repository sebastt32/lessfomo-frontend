import { useCallback } from 'react';
import { parseMinConvictionWallets, withMinConvictionWallets } from '../lib/smartWalletFilter';
import { navigate, useLocationSearch } from './useLocationSearch';

/** The conviction-wallet threshold from the URL, and a setter that keeps every other URL parameter. */
export function useMinConvictionWallets(): [number, (min: number) => void] {
  const min = parseMinConvictionWallets(useLocationSearch());
  const setMin = useCallback((next: number) => {
    // The history list restarts at page 1 when the threshold changes.
    const params = new URLSearchParams(window.location.search);
    params.delete('page');
    navigate(withMinConvictionWallets(`?${params.toString()}`, next));
  }, []);
  return [min, setMin];
}
