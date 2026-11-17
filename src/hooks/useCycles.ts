import type { ApiClient } from '../api/client';
import type { CyclesAnalysisResponse } from '../api/types';
import { isMissingEndpoint } from '../state/errors';
import { useResource, type ResourceResult } from './useResource';

/** GET /api/analysis/cycles with the API's default date range; 'unavailable' on a backend that predates it. */
export function useCyclesAnalysis(client: ApiClient): ResourceResult<CyclesAnalysisResponse> {
  return useResource('analysis:cycles', (signal) => client.getCyclesAnalysis({ signal }), isMissingEndpoint);
}
