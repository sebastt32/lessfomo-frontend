import { useCallback, useMemo, useState } from 'react';
import { ViewNav, type ViewNavItem } from '../components/molecules/ViewNav';
import { StatsContainer } from '../containers/StatsContainer';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { parseAppLocation, serializeAppLocation, type AppView, type HistoryFilters } from '../lib/historyQuery';
import { parseMinSmartWallets, withMinSmartWallets } from '../lib/smartWalletFilter';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';
import { InsightsPage } from './InsightsPage';

const HISTORY_DEFAULT_SEARCH = '?view=history';

/** Picks the view from the URL and keeps the history filters, sort and page in the query string. */
export function AppShell() {
  const search = useLocationSearch();
  const location = useMemo(() => parseAppLocation(search), [search]);
  // Coming back to History restores the filters it had, within this visit.
  const [lastHistorySearch, setLastHistorySearch] = useState(HISTORY_DEFAULT_SEARCH);
  if (location.view === 'history' && search !== lastHistorySearch) setLastHistorySearch(search);

  // The smart-wallet threshold applies to every view, so it travels with every link and filter change.
  const minSmartWallets = parseMinSmartWallets(search);

  const onFiltersChange = useCallback(
    (history: HistoryFilters) => {
      navigate(withMinSmartWallets(serializeAppLocation({ view: 'history', history }), minSmartWallets));
    },
    [minSmartWallets],
  );

  const liveSearch = withMinSmartWallets('', minSmartWallets);
  const items: ViewNavItem<AppView>[] = [
    { value: 'live', label: 'Live', href: liveSearch === '' ? window.location.pathname : liveSearch },
    {
      value: 'history',
      label: 'History',
      href: withMinSmartWallets(lastHistorySearch, minSmartWallets),
    },
    { value: 'insights', label: 'Insights', href: withMinSmartWallets('?view=insights', minSmartWallets) },
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

  switch (location.view) {
    case 'history':
      return <HistoryPage filters={location.history} onFiltersChange={onFiltersChange} headerExtras={headerExtras} />;
    case 'insights':
      return <InsightsPage headerExtras={headerExtras} />;
    default:
      return <DashboardPage headerExtras={headerExtras} />;
  }
}
