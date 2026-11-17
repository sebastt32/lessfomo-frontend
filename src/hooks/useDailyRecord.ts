import type { ApiClient } from '../api/client';
import type { TokenListItem } from '../api/types';
import { dayBounds, monthBounds, recordQuery, successSummary, type SuccessSummary } from '../lib/dailyRecord';
import { useResource, type ResourceResult } from './useResource';

/** Pages a day may take at most (2,000 tokens), so a runaway total cannot loop forever. */
const MAX_PAGES = 10;

export interface DailyRecordData {
  /** Every token that appeared on the day, newest first. */
  tokens: TokenListItem[];
  day: SuccessSummary;
  month: SuccessSummary;
}

async function loadDayTokens(client: ApiClient, day: string, signal: AbortSignal): Promise<TokenListItem[]> {
  const tokens: TokenListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await client.listTokens(recordQuery(day, page), { signal });
    tokens.push(...response.tokens);
    if (response.tokens.length === 0 || tokens.length >= response.total) break;
  }
  return tokens;
}

/** The tokens that appeared on `day` (YYYY-MM-DD, local) and the success of that day and of its month. */
export function useDailyRecord(client: ApiClient, day: string): ResourceResult<DailyRecordData> {
  return useResource(`record:${day}`, async (signal) => {
    const [tokens, dayAnalysis, monthAnalysis] = await Promise.all([
      loadDayTokens(client, day, signal),
      client.getCyclesAnalysis({ ...dayBounds(day), signal }),
      client.getCyclesAnalysis({ ...monthBounds(day), signal }),
    ]);
    return { tokens, day: successSummary(dayAnalysis), month: successSummary(monthAnalysis) };
  });
}
