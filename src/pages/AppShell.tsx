import { useCallback, useMemo, useState } from 'react';
import { ViewNav, type ViewNavItem } from '../components/molecules/ViewNav';
import { ThemeToggleContainer } from '../containers/ThemeToggleContainer';
import { StatsContainer } from '../containers/StatsContainer';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { parseAppLocation, serializeAppLocation, type AppView, type HistoryFilters } from '../lib/historyQuery';
import { parseMinConvictionWallets, withMinConvictionWallets } from '../lib/smartWalletFilter';
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

  // The conviction-wallet threshold applies to every view, so it travels with every link and filter change.
  const minConvictionWallets = parseMinConvictionWallets(search);

  const onFiltersChange = useCallback(
    (history: HistoryFilters) => {
      navigate(withMinConvictionWallets(serializeAppLocation({ view: 'history', history }), minConvictionWallets));
    },
    [minConvictionWallets],
  );

  const liveSearch = withMinConvictionWallets('', minConvictionWallets);
  const items: ViewNavItem<AppView>[] = [
    { value: 'live', label: 'Live', href: liveSearch === '' ? window.location.pathname : liveSearch },
    {
      value: 'history',
      label: 'History',
      href: withMinConvictionWallets(lastHistorySearch, minConvictionWallets),
    },
    { value: 'insights', label: 'Insights', href: withMinConvictionWallets('?view=insights', minConvictionWallets) },
  ];

  const headerExtras = (
    <>
      <ViewNav
        items={items}
        current={location.view}
        onNavigate={(href) => navigate(href.startsWith('?') ? href : '')}
      />
      <StatsContainer />
      <ThemeToggleContainer />
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
