import { useCallback, useState, type ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { HistoryTemplate } from '../components/templates/HistoryTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { HistoryContainer } from '../containers/HistoryContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { SmartWalletFilterContainer } from '../containers/SmartWalletFilterContainer';
import { TokenDetailContainer } from '../containers/TokenDetailContainer';
import { useNow } from '../hooks/useNow';
import type { HistoryFilters } from '../lib/historyQuery';

export interface HistoryPageProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  headerExtras?: ReactNode;
}

export function HistoryPage({ filters, onFiltersChange, headerExtras }: HistoryPageProps) {
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const now = useNow();
  const close = useCallback(() => setSelectedMint(null), []);

  return (
    <HistoryTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={
        <>
          <OfflineNoticeContainer />
          <SmartWalletFilterContainer />
        </>
      }
      list={
        <HistoryContainer
          filters={filters}
          onFiltersChange={onFiltersChange}
          selectedMint={selectedMint}
          onSelect={setSelectedMint}
          now={now}
        />
      }
      detail={
        selectedMint === null ? null : (
          <TokenDetailContainer key={selectedMint} mint={selectedMint} onClose={close} now={now} />
        )
      }
      footer={<Disclaimer />}
    />
  );
}
