import { useCallback } from 'react';
import { parseAnalysisBy, withAnalysisBy, type AnalysisBy } from '../lib/smartWalletFilter';
import { navigate, useLocationSearch } from './useLocationSearch';

/** How the Insights analysis groups tokens, from the URL (`by`), and a setter that keeps other parameters. */
export function useAnalysisBy(): [AnalysisBy, (by: AnalysisBy) => void] {
  const by = parseAnalysisBy(useLocationSearch());
  const setBy = useCallback((next: AnalysisBy) => navigate(withAnalysisBy(window.location.search, next)), []);
  return [by, setBy];
}
