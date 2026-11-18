import { useMemo, type ReactNode } from 'react';
import { ViewNav, type ViewNavItem } from '../components/molecules/ViewNav';
import { ThemeToggleContainer } from '../containers/ThemeToggleContainer';
import { WelcomeGuideContainer } from '../containers/WelcomeGuideContainer';
import { StatsContainer } from '../containers/StatsContainer';
import { navigate, useLocationSearch } from '../hooks/useLocationSearch';
import { currentBackTarget } from '../hooks/tokenNavigation';
import { parseAppLocation, type AppView } from '../lib/appLocation';
import { parseMinConvictionWallets, withMinConvictionWallets } from '../lib/smartWalletFilter';
import { DailyRecordPage } from './DailyRecordPage';
import { DashboardPage } from './DashboardPage';
import { TokenPage } from './TokenPage';

export interface AppShellProps {
  /** Who is signed in and the account actions, shown in the header; absent when the backend has no authentication. */
  account?: ReactNode;
}

/** Picks the view from the URL: Live, the daily record, or one token's own view. */
export function AppShell({ account }: AppShellProps = {}) {
  const search = useLocationSearch();
  const location = useMemo(() => parseAppLocation(search), [search]);

  // The conviction-wallet threshold applies to every view, so it travels with every link.
  const minConvictionWallets = parseMinConvictionWallets(search);
  const liveSearch = withMinConvictionWallets('', minConvictionWallets);
  const items: ViewNavItem<Exclude<AppView, 'token'>>[] = [
    { value: 'live', label: 'En vivo', href: liveSearch === '' ? window.location.pathname : liveSearch },
    { value: 'record', label: 'Registro diario', href: withMinConvictionWallets('?view=record', minConvictionWallets) },
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
      <WelcomeGuideContainer />
      {account}
    </>
  );

  switch (location.view) {
    case 'record':
      return <DailyRecordPage headerExtras={headerExtras} />;
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
