import { useCallback, useState, type ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { DashboardTemplate } from '../components/templates/DashboardTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { MoversContainer } from '../containers/MoversContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { SmartWalletFilterContainer } from '../containers/SmartWalletFilterContainer';
import { ScreeningsContainer } from '../containers/ScreeningsContainer';
import { TokenDetailContainer } from '../containers/TokenDetailContainer';
import { useNow } from '../hooks/useNow';

export interface DashboardPageProps {
  /** View navigation and totals for the header. */
  headerExtras?: ReactNode;
}

export function DashboardPage({ headerExtras }: DashboardPageProps = {}) {
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const now = useNow();
  const close = useCallback(() => setSelectedMint(null), []);

  return (
    <DashboardTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={
        <>
          <OfflineNoticeContainer />
          <SmartWalletFilterContainer />
        </>
      }
      movers={<MoversContainer selectedMint={selectedMint} onSelect={setSelectedMint} now={now} />}
      detail={
        selectedMint === null ? null : (
          <TokenDetailContainer key={selectedMint} mint={selectedMint} onClose={close} now={now} />
        )
      }
      feed={<ScreeningsContainer selectedMint={selectedMint} onSelect={setSelectedMint} now={now} />}
      footer={<Disclaimer />}
    />
  );
}
