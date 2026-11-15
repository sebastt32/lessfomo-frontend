import type { ReactNode } from 'react';
import { AppHeader } from '../components/organisms/AppHeader';
import { useLiveFeedContext } from './LiveFeedProvider';

export interface HeaderContainerProps {
  /** View navigation and totals, shown under the brand. */
  extras?: ReactNode;
}

export function HeaderContainer({ extras }: HeaderContainerProps) {
  const { state } = useLiveFeedContext();
  return (
    <AppHeader
      connection={state.connection}
      sources={state.sources}
      tokensDetected={state.tokensDetected}
      extras={extras}
    />
  );
}
