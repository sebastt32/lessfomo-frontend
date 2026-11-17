import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ViewNav, type ViewNavItem } from '../components/molecules/ViewNav';
import { ThemeToggleContainer } from '../containers/ThemeToggleContainer';
import { StatsContainer } from '../containers/StatsContainer';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { currentBackTarget } from '../hooks/tokenNavigation';
import { parseAppLocation, serializeAppLocation, type AppView, type HistoryFilters } from '../lib/historyQuery';
import { parseMinConvictionWallets, withMinConvictionWallets } from '../lib/smartWalletFilter';
import { DailyRecordPage } from './DailyRecordPage';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';
import { InsightsPage } from './InsightsPage';
import { TokenPage } from './TokenPage';

const HISTORY_DEFAULT_SEARCH = '?view=history';

export interface AppShellProps {
  /** Who is signed in and the account actions, shown in the header; absent when the backend has no authentication. */
  account?: ReactNode;
}

/** Picks the view from the URL: the lists (with the history filters, sort and page) or one token's own view. */
export function AppShell({ account }: AppShellProps = {}) {
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
  const items: ViewNavItem<Exclude<AppView, 'token'>>[] = [
    { value: 'live', label: 'Live', href: liveSearch === '' ? window.location.pathname : liveSearch },
    {
      value: 'history',
      label: 'History',
      href: withMinConvictionWallets(lastHistorySearch, minConvictionWallets),
    },
    { value: 'record', label: 'Daily record', href: withMinConvictionWallets('?view=record', minConvictionWallets) },
    { value: 'insights', label: 'Insights', href: withMinConvictionWallets('?view=insights', minConvictionWallets) },
  ];

  const headerExtras = (
    <>
      <ViewNav
        items={items}
        // A token's own view is none of the lists: no item is current.
        current={location.view === 'token' ? null : location.view}
        onNavigate={(href) => navigate(href.startsWith('?') ? href : '')}
      />
      <StatsContainer />
      <ThemeToggleContainer />
      {account}
    </>
  );

  switch (location.view) {
    case 'history':
      return <HistoryPage filters={location.history} onFiltersChange={onFiltersChange} headerExtras={headerExtras} />;
    case 'record':
      return <DailyRecordPage headerExtras={headerExtras} />;
    case 'insights':
      return <InsightsPage headerExtras={headerExtras} />;
    case 'token': {
      const back = currentBackTarget(search);
      return (
        <TokenPage
          mint={location.mint ?? ''}
          back={{ href: back.search === '' ? window.location.pathname : back.search, label: back.label }}
          onBack={() => navigate(back.search)}
          headerExtras={headerExtras}
        />
      );
    }
    default:
      return <DashboardPage headerExtras={headerExtras} />;
  }
}
