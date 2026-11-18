import type { ReactNode } from 'react';
import { Disclaimer } from '../components/organisms/Disclaimer';
import { HistoryTemplate } from '../components/templates/HistoryTemplate';
import { DailyRecordContainer } from '../containers/DailyRecordContainer';
import { HeaderContainer } from '../containers/HeaderContainer';
import { OfflineNoticeContainer } from '../containers/OfflineNoticeContainer';

export interface DailyRecordPageProps {
  headerExtras?: ReactNode;
}

export function DailyRecordPage({ headerExtras }: DailyRecordPageProps) {
  return (
    <HistoryTemplate
      header={<HeaderContainer extras={headerExtras} />}
      notice={<OfflineNoticeContainer />}
      list={<DailyRecordContainer />}
      footer={<Disclaimer />}
      skipLink={{ href: '#daily-record', label: 'Saltar al registro diario' }}
    />
  );
}
