import type { TokenListQuery } from '../api/client';
import type { CyclePhase, Lifecycle, SafetyStatus, TokenSort, TokenSortField } from '../api/types';
import { ALL_TIME, dateFilterBounds, parseDateFilter, serializeDateFilter, type DateFilter } from './dateRange';

/**
 * The app's URL state: which view is open, for the history list its filters, sort and page, and for the
 * token view its mint. Everything lives in the query string so a filtered list or a token can be shared
 * and reloaded.
 */

export type AppView = 'live' | 'history' | 'insights' | 'token';

export interface HistoryFilters {
  date: DateFilter;
  /** Canonical order, no duplicates; empty means every status. */
  status: SafetyStatus[];
  lifecycle: Lifecycle | null;
  minScore: number | null;
  /** Cycle phases, canonical order; absent means every phase. */
  phase?: CyclePhase[];
  /** true: only tokens that appeared late; false: only those that appeared in time; absent: both. */
  appearedLate?: boolean;
  q: string;
  sort: TokenSort;
  page: number;
}

export interface AppLocation {
  view: AppView;
  history: HistoryFilters;
  /** The token shown by the token view; only present there. */
  mint?: string;
}

export const HISTORY_PAGE_SIZE = 50;

export const STATUS_ORDER: readonly SafetyStatus[] = ['passed', 'failed', 'unverified', 'pending'];

export const PHASE_ORDER: readonly CyclePhase[] = ['stable', 'exploding', 'crashed'];

export const SORT_FIELDS: readonly TokenSortField[] = [
  'detectedAt',
  'appearedAt',
  'investWindow',
  'maxScore',
  'peakMarketCapSol',
  'liquidity',
  'smartWallets',
  'convictionWallets',
];

/** Fields the API only sorts in one direction. */
const DESC_ONLY: readonly TokenSortField[] = ['smartWallets', 'convictionWallets'];

export const DEFAULT_SORT: TokenSort = { field: 'detectedAt', direction: 'desc' };

export const DEFAULT_HISTORY: HistoryFilters = {
  date: ALL_TIME,
  status: [],
  lifecycle: null,
  minScore: null,
  q: '',
  sort: DEFAULT_SORT,
  page: 1,
};

export function normalizeStatuses(values: readonly string[]): SafetyStatus[] {
  return STATUS_ORDER.filter((status) => values.includes(status));
}

function parseInteger(value: string | null, min: number, max: number): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

function parseSort(value: string | null): TokenSort {
  const [field, direction] = (value ?? '').split(':');
  if ((SORT_FIELDS as readonly string[]).includes(field ?? '') && (direction === 'asc' || direction === 'desc')) {
    const sortField = field as TokenSortField;
    if (direction === 'asc' && DESC_ONLY.includes(sortField)) return DEFAULT_SORT;
    return { field: sortField, direction };
  }
  return DEFAULT_SORT;
}

function parseLifecycle(value: string | null): Lifecycle | null {
  return value === 'active' || value === 'dead' ? value : null;
}

export function normalizePhases(values: readonly string[]): CyclePhase[] {
  return PHASE_ORDER.filter((phase) => values.includes(phase));
}

/** Reads the view, history filters and token mint from `location.search`; invalid values fall back to defaults. */
export function parseAppLocation(search: string): AppLocation {
  const params = new URLSearchParams(search);
  const requested = params.get('view');
  const mint = (params.get('mint') ?? '').trim();
  let view: AppView = 'live';
  if (requested === 'history' || requested === 'insights') view = requested;
  // A token view without a mint has nothing to show.
  else if (requested === 'token' && mint !== '') view = 'token';

  const history: HistoryFilters = {
    date: parseDateFilter(params.get('range')),
    status: normalizeStatuses((params.get('status') ?? '').split(',')),
    lifecycle: parseLifecycle(params.get('lifecycle')),
    minScore: parseInteger(params.get('minScore'), 0, 100),
    q: (params.get('q') ?? '').trim(),
    sort: parseSort(params.get('sort')),
    page: parseInteger(params.get('page'), 1, Number.MAX_SAFE_INTEGER) ?? 1,
  };
  const phase = normalizePhases((params.get('phase') ?? '').split(','));
  if (phase.length > 0) history.phase = phase;
  const late = params.get('appearedLate');
  if (late === 'true' || late === 'false') history.appearedLate = late === 'true';

  return view === 'token' ? { view, history, mint } : { view, history };
}

/** The query string for a location ('' for the default live view), omitting every default value. */
export function serializeAppLocation({ view, history, mint }: AppLocation): string {
  if (view === 'live') return '';
  if (view === 'token') return mint ? `?${new URLSearchParams({ view, mint }).toString()}` : '';
  const params = new URLSearchParams({ view });
  if (view === 'insights') return `?${params.toString()}`;
  const range = serializeDateFilter(history.date);
  if (range !== null) params.set('range', range);
  if (history.status.length > 0) params.set('status', normalizeStatuses(history.status).join(','));
  if (history.lifecycle) params.set('lifecycle', history.lifecycle);
  if (history.minScore !== null) params.set('minScore', String(history.minScore));
  if (history.phase && history.phase.length > 0) params.set('phase', normalizePhases(history.phase).join(','));
  if (history.appearedLate !== undefined) params.set('appearedLate', String(history.appearedLate));
  if (history.q.trim() !== '') params.set('q', history.q.trim());
  if (history.sort.field !== DEFAULT_SORT.field || history.sort.direction !== DEFAULT_SORT.direction) {
    params.set('sort', `${history.sort.field}:${history.sort.direction}`);
  }
  if (history.page !== 1) params.set('page', String(history.page));
  // Commas, colons and dots are legal in a query value; keep them readable in the address bar.
  return `?${params.toString().replace(/%2C/gi, ',').replace(/%3A/gi, ':')}`;
}

/** Whether any filter differs from the defaults (sort and page do not count). */
export function hasActiveFilters(filters: HistoryFilters): boolean {
  return (
    filters.date.kind !== 'all' ||
    filters.status.length > 0 ||
    filters.lifecycle !== null ||
    filters.minScore !== null ||
    (filters.phase !== undefined && filters.phase.length > 0) ||
    filters.appearedLate !== undefined ||
    filters.q !== ''
  );
}

/** GET /api/tokens query for the filters; `now` anchors the date presets to the viewer's local day. */
export function toTokenListQuery(filters: HistoryFilters, now: Date): TokenListQuery {
  const query: TokenListQuery = { ...dateFilterBounds(filters.date, now) };
  if (filters.status.length > 0) query.status = filters.status;
  if (filters.lifecycle) query.lifecycle = filters.lifecycle;
  if (filters.minScore !== null) query.minScore = filters.minScore;
  if (filters.phase && filters.phase.length > 0) query.phase = filters.phase;
  if (filters.appearedLate !== undefined) query.appearedLate = filters.appearedLate;
  if (filters.q !== '') query.q = filters.q;
  query.sort = filters.sort;
  query.page = filters.page;
  query.pageSize = HISTORY_PAGE_SIZE;
  return query;
}
