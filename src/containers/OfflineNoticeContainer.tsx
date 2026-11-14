import { OfflineNotice } from '../components/organisms/OfflineNotice';
import { isNetworkError } from '../state/errors';
import { useLiveFeedContext } from './LiveFeedProvider';

/** Shows the offline banner when neither the REST API nor the stream can be reached. */
export function OfflineNoticeContainer() {
  const { state, actions, meta } = useLiveFeedContext();
  const offline = state.connection === 'offline' && isNetworkError(state.health.error);
  return offline ? <OfflineNotice apiUrl={meta.client.baseUrl} onRetry={actions.reload} /> : null;
}
