import { AppHeader } from '../components/organisms/AppHeader';
import { useLiveFeedContext } from './LiveFeedProvider';

export function HeaderContainer() {
  const { state } = useLiveFeedContext();
  return <AppHeader connection={state.connection} sources={state.sources} tokensDetected={state.tokensDetected} />;
}
