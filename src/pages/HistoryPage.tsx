import type { ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { HistoryTemplate } from '../components/templates/HistoryTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { HistoryContainer } from '../containers/HistoryContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';
import { SmartWalletFilterContainer } from '../containers/SmartWalletFilterContainer';
import { useNow } from '../hooks/useNow';
import { openToken } from '../hooks/tokenNavigation';
import type { HistoryFilters } from '../lib/historyQuery';

export interface HistoryPageProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  headerExtras?: ReactNode;
  /** Opens a token's own view; defaults to navigating to `?view=token&mint=<mint>`. */
  onOpenToken?: (mint: string) => void;
}

export function HistoryPage({ filters, onFiltersChange, headerExtras, onOpenToken = openToken }: HistoryPageProps) {
  const now = useNow();

  return (
    <HistoryTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={
        <>
          <OfflineNoticeContainer />
          <SmartWalletFilterContainer />
        </>
      }
      list={<HistoryContainer filters={filters} onFiltersChange={onFiltersChange} onSelect={onOpenToken} now={now} />}
      footer={<Disclaimer />}
    />
  );
}
