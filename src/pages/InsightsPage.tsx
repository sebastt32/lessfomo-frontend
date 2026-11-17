import type { ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { HistoryTemplate } from '../components/templates/HistoryTemplate';
import { HeaderContainer } from '../containers/HeaderContainer';
import { InsightsContainer } from '../containers/InsightsContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';

export interface InsightsPageProps {
  headerExtras?: ReactNode;
}

export function InsightsPage({ headerExtras }: InsightsPageProps) {
  return (
    <HistoryTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={<OfflineNoticeContainer />}
      list={<InsightsContainer />}
      footer={<Disclaimer />}
      skipLink={{ href: '#insights', label: 'Skip to the analysis' }}
    />
  );
}
