import { SmartWalletFilterBar } from '../components/organisms/SmartWalletFilterBar';
import { useMinSmartWallets } from '../hooks/useMinSmartWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export function SmartWalletFilterContainer() {
  const { smartWallets } = useLiveFeedContext();
  const [min, setMin] = useMinSmartWallets();
  return <SmartWalletFilterBar min={min} onChange={setMin} support={smartWallets.support} />;
}
