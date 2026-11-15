import { StatsBar } from '../components/organisms/StatsBar';
import { useStats } from '../hooks/useHistoryData';
import { useNow } from '../hooks/useNow';
import { useLiveFeedContext } from './LiveFeedProvider';

const REFRESH_MS = 60_000;

/** Database totals, refreshed once a minute. Renders nothing until they load or when the backend lacks /api/stats. */
export function StatsContainer() {
  const { meta } = useLiveFeedContext();
  const minute = Math.floor(useNow(REFRESH_MS) / REFRESH_MS);
  const { state } = useStats(meta.client, minute);
  const stats = state.status === 'ready' ? state.data : state.status === 'loading' ? state.data : null;
  return stats ? <StatsBar stats={stats} /> : null;
}
