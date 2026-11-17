import type { ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { DashboardTemplate } from '../components/templates/DashboardTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { MoversContainer } from '../containers/MoversContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { SmartWalletFilterContainer } from '../containers/SmartWalletFilterContainer';
import { ScreeningsContainer } from '../containers/ScreeningsContainer';
import { useNow } from '../hooks/useNow';
import { openToken } from '../hooks/tokenNavigation';

export interface DashboardPageProps {
  /** View navigation and totals for the header. */
  headerExtras?: ReactNode;
  /** Opens a token's own view; defaults to navigating to `?view=token&mint=<mint>`. */
  onOpenToken?: (mint: string) => void;
}

export function DashboardPage({ headerExtras, onOpenToken = openToken }: DashboardPageProps = {}) {
  const now = useNow();

  return (
    <DashboardTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={
        <>
          <OfflineNoticeContainer />
          <SmartWalletFilterContainer />
        </>
      }
      movers={<MoversContainer onSelect={onOpenToken} now={now} />}
      feed={<ScreeningsContainer onSelect={onOpenToken} now={now} />}
      footer={<Disclaimer />}
    />
  );
}
