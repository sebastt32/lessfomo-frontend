import { useCallback } from 'react';
import { parseMinSmartWallets, withMinSmartWallets } from '../lib/smartWalletFilter';
import { navigate, useLocationSearch } from './useLocationSearch';

/** The smart-wallet threshold from the URL, and a setter that keeps every other URL parameter. */
export function useMinSmartWallets(): [number, (min: number) => void] {
  const min = parseMinSmartWallets(useLocationSearch());
  const setMin = useCallback((next: number) => {
    // The history list restarts at page 1 when the threshold changes.
    const params = new URLSearchParams(window.location.search);
    params.delete('page');
    navigate(withMinSmartWallets(`?${params.toString()}`, next));
  }, []);
  return [min, setMin];
}
