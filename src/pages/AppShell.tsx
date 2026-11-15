import { useCallback, useMemo, useState } from 'react';
import { ViewNav, type ViewNavItem } from '../components/molecules/ViewNav';
import { StatsContainer } from '../containers/StatsContainer';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { parseAppLocation, serializeAppLocation, type AppView, type HistoryFilters } from '../lib/historyQuery';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';

const HISTORY_DEFAULT_SEARCH = '?view=history';

/** Picks the view from the URL and keeps the history filters, sort and page in the query string. */
export function AppShell() {
  const search = useLocationSearch();
  const location = useMemo(() => parseAppLocation(search), [search]);
  // Coming back to History restores the filters it had, within this visit.
  const [lastHistorySearch, setLastHistorySearch] = useState(HISTORY_DEFAULT_SEARCH);
  if (location.view === 'history' && search !== lastHistorySearch) setLastHistorySearch(search);

  const onFiltersChange = useCallback((history: HistoryFilters) => {
    navigate(serializeAppLocation({ view: 'history', history }));
  }, []);

  const items: ViewNavItem<AppView>[] = [
    { value: 'live', label: 'Live', href: window.location.pathname },
    {
      value: 'history',
      label: 'History',
      href: lastHistorySearch,
    },
  ];

  const headerExtras = (
    <>
      <ViewNav
        items={items}
        current={location.view}
        onNavigate={(href) => navigate(href.startsWith('?') ? href : '')}
      />
      <StatsContainer />
    </>
  );

  return location.view === 'history' ? (
    <HistoryPage filters={location.history} onFiltersChange={onFiltersChange} headerExtras={headerExtras} />
  ) : (
    <DashboardPage headerExtras={headerExtras} />
  );
}
