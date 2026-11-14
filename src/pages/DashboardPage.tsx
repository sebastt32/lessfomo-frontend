import { useCallback, useState } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { DashboardTemplate } from '../components/templates/DashboardTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { MoversContainer } from '../containers/MoversContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { ScreeningsContainer } from '../containers/ScreeningsContainer';
import { TokenDetailContainer } from '../containers/TokenDetailContainer';
import { useNow } from '../hooks/useNow';

export function DashboardPage() {
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const now = useNow();
  const close = useCallback(() => setSelectedMint(null), []);

  return (
    <DashboardTemplate
      header={<HeaderContainer />}
      notice={<OfflineNoticeContainer />}
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
