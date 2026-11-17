import { SmartWalletFilterBar } from '../components/organisms/SmartWalletFilterBar';
import { useMinConvictionWallets } from '../hooks/useMinConvictionWallets';
import { useLiveFeedContext } from './LiveFeedProvider';

export function SmartWalletFilterContainer() {
  const { smartWallets } = useLiveFeedContext();
  const [min, setMin] = useMinConvictionWallets();
  return <SmartWalletFilterBar min={min} onChange={setMin} support={smartWallets.support} />;
}
