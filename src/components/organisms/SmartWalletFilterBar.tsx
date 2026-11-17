import type { SmartWalletSupport } from '../../state/smartWalletFeed';
import {
  describeSmartWalletFilter,
  SMART_WALLET_OPTIONS,
  smartWalletOptionLabel,
} from '../../lib/smartWalletFilter';
import { SegmentedControl } from '../molecules/SegmentedControl';
import './SmartWalletFilterBar.css';

export interface SmartWalletFilterBarProps {
  min: number;
  onChange: (min: number) => void;
  support: SmartWalletSupport;
}

/** Says which tokens the lists show (only those bought by good-history wallets) and changes the minimum. */
export function SmartWalletFilterBar({ min, onChange, support }: SmartWalletFilterBarProps) {
  const unavailable = support === 'unavailable';
  return (
    <section className="smart-filter" aria-label="Smart-wallet filter">
      <div className="smart-filter__text">
        <p className="smart-filter__title">
          {unavailable ? 'Showing every token: smart-wallet data not available yet' : describeSmartWalletFilter(min)}
        </p>
        <p className="smart-filter__hint">
          {unavailable
            ? 'This screener API does not report good-history wallets yet, so the lists are not filtered. They will be once the backend is updated.'
            : 'A good-history wallet won most of the tokens it traded in the last 7 days and made a net profit. Raise the minimum to see fewer, better-backed tokens.'}
        </p>
      </div>
      <div className="smart-filter__control">
        <span className="smart-filter__label" aria-hidden="true">
          Minimum good wallets
        </span>
        <SegmentedControl<string>
          label="Minimum good-history wallets"
          value={String(min)}
          options={SMART_WALLET_OPTIONS.map((option) => ({
            value: String(option),
            label: smartWalletOptionLabel(option),
          }))}
          onChange={(value) => onChange(Number(value))}
        />
      </div>
    </section>
  );
}
