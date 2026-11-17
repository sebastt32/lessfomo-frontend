import { Panel } from '../components/molecules/Panel';
import { Pagination } from '../components/molecules/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/molecules/SectionState';
import { HistoryFilters } from '../components/organisms/HistoryFilters';
import { TokenHistoryTable } from '../components/organisms/TokenHistoryTable';
import { useTokenList } from '../hooks/useHistoryData';
import { describeDateFilter, type DateFilter } from '../lib/dateRange';
import { formatCount } from '../lib/format';
import {
  DEFAULT_HISTORY,
  hasActiveFilters,
  HISTORY_PAGE_SIZE,
  toTokenListQuery,
  type HistoryFilters as Filters,
} from '../lib/historyQuery';
import { isNetworkError } from '../state/errors';
import { describeConvictionFilter } from '../lib/smartWalletFilter';
import { useMinConvictionWallets } from '../hooks/useMinConvictionWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface HistoryContainerProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  selectedMint: string | null;
  onSelect: (mint: string) => void;
  /** Reference time (ms since epoch); also anchors the date presets to the viewer's local day. */
  now: number;
}

/** pump.fun launched in January 2024: nothing older can be in the screener's database. */
const FIRST_YEAR = 2024;

function yearsUpTo(now: number): number[] {
  const current = new Date(now).getFullYear();
  return Array.from({ length: Math.max(1, current - FIRST_YEAR + 1) }, (_, i) => current - i);
}

/** "today", "in 2025", "on February 3, 2025", "from Nov 1, 2026 to Nov 10, 2026", ... */
function createdPhrase(filter: DateFilter): string {
  const label = describeDateFilter(filter);
  switch (filter.kind) {
    case 'all':
      return 'at any time';
    case 'preset':
      return label.toLowerCase();
    case 'period':
      return filter.day === null ? `in ${label}` : `on ${label}`;
    case 'range':
      return filter.from && filter.to ? `from ${label}` : label.charAt(0).toLowerCase() + label.slice(1);
  }
}

export function HistoryContainer({ filters, onFiltersChange, selectedMint, onSelect, now }: HistoryContainerProps) {
  const { meta } = useLiveFeedContext();
  // Presets resolve to local day boundaries, so the query (and the request) only changes when a day rolls over.
  const [minConvictionWallets] = useMinConvictionWallets();
  const query = { ...toTokenListQuery(filters, new Date(now)), minConvictionWallets };
  const { state, retry } = useTokenList(meta.client, query);

  const changeFilters = (next: Filters) => onFiltersChange({ ...next, page: 1 });
  const reset = () => onFiltersChange({ ...DEFAULT_HISTORY, sort: filters.sort });
  const data = state.status === 'ready' || state.status === 'loading' ? state.data : null;
  const created = `created ${createdPhrase(filters.date)}`;
  // A backend that predates smart wallets ignores the filter and sends rows without counts; one that
  // predates trading styles sends counts without `conviction` and ignores the conviction minimum.
  const hasRows = data !== null && data.tokens.length > 0;
  const smartDataMissing = hasRows && data.tokens.every((t) => !t.smartWallets);
  const convictionMissing =
    hasRows && !smartDataMissing && data.tokens.every((t) => typeof t.smartWallets?.conviction !== 'number');
  const smartPhrase =
    smartDataMissing || convictionMissing
      ? ''
      : ` and bought by ≥${minConvictionWallets} conviction ${minConvictionWallets === 1 ? 'wallet' : 'wallets'}`;
  const description = data
    ? `${formatCount(data.total)} ${data.total === 1 ? 'token' : 'tokens'} ${created}${smartPhrase}, from the screener's database.`
    : `Tokens ${created}${smartPhrase}, from the screener's database.`;

  let body;
  if (state.status === 'unavailable') {
    body = (
      <EmptyState title="The token history is not available yet">
        This screener API does not have the history list (GET /api/tokens) yet. It appears once the backend is updated;
        the live view keeps working meanwhile.
      </EmptyState>
    );
  } else if (state.status === 'error') {
    body =
      state.error.code === 'INVALID_QUERY' ? (
        <ErrorState title="The screener rejected these filters" onRetry={reset} retryLabel="Reset filters">
          {state.error.message}
        </ErrorState>
      ) : (
        <ErrorState
          title={isNetworkError(state.error) ? 'Could not reach the screener API' : 'Could not load the token history'}
          onRetry={retry}
        >
          {state.error.message}
        </ErrorState>
      );
  } else if (data === null) {
    body = <LoadingState>Loading the token history…</LoadingState>;
  } else if (data.tokens.length === 0) {
    body = (
      <EmptyState
        title={hasActiveFilters(filters) ? 'No tokens match these filters' : 'No token passes the conviction-wallet filter yet'}
      >
        {describeConvictionFilter(minConvictionWallets)}.{' '}
        {hasActiveFilters(filters)
          ? 'Try a wider date range, fewer filters or a lower minimum of conviction wallets.'
          : 'Tokens appear here once enough conviction wallets buy them. Lower the minimum above to see more.'}
      </EmptyState>
    );
  } else {
    body = (
      <div className="history__results" aria-busy={state.status === 'loading'}>
        {smartDataMissing ? (
          <p className="history__note" role="note">
            Smart-wallet data not available yet: this screener API does not report good-history wallets, so the list
            is not filtered by them.
          </p>
        ) : null}
        {convictionMissing ? (
          <p className="history__note" role="note">
            Conviction data not available yet: this screener API does not report conviction wallets, so the list is
            not filtered by the conviction minimum and sorting by conviction wallets may be rejected.
          </p>
        ) : null}
        <TokenHistoryTable
          items={data.tokens}
          selectedMint={selectedMint}
          onSelect={onSelect}
          sort={filters.sort}
          onSortChange={(sort) => changeFilters({ ...filters, sort })}
          now={now}
        />
        <Pagination
          label="Token history"
          page={data.page}
          pageSize={data.pageSize || HISTORY_PAGE_SIZE}
          total={data.total}
          onPageChange={(page) => onFiltersChange({ ...filters, page })}
        />
      </div>
    );
  }

  return (
    <Panel
      id="history"
      title="Token history"
      description={description}
      actions={
        <button type="button" className="button button--quiet" onClick={retry}>
          Refresh
        </button>
      }
    >
      <HistoryFilters filters={filters} years={yearsUpTo(now)} onChange={changeFilters} onReset={reset} />
      {state.status === 'loading' && data ? (
        <p className="visually-hidden" role="status">
          Updating the list…
        </p>
      ) : null}
      {body}
    </Panel>
  );
}
