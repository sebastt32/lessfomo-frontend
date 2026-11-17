import type { SmartWalletSupport } from '../../state/smartWalletFeed';
import {
  CONVICTION_WALLET_OPTIONS,
  convictionOptionLabel,
  describeConvictionFilter,
} from '../../lib/smartWalletFilter';
import { SegmentedControl } from '../molecules/SegmentedControl';
import './SmartWalletFilterBar.css';

export interface SmartWalletFilterBarProps {
  min: number;
  onChange: (min: number) => void;
  support: SmartWalletSupport;
}

function copy(support: SmartWalletSupport, min: number): { title: string; hint: string } {
  switch (support) {
    case 'unavailable':
      return {
        title: 'Showing every token: smart-wallet data not available yet',
        hint: 'This screener API does not report good-history wallets yet, so the lists are not filtered. They will be once the backend is updated.',
      };
    case 'no-conviction':
      return {
        title: 'Showing the screener’s public tokens: conviction data not available yet',
        hint: 'This screener API does not report conviction wallets yet, so the lists show whatever it makes public, without the conviction minimum. They will be filtered once the backend is updated.',
      };
    default:
      return {
        title: describeConvictionFilter(min),
        hint: 'A conviction wallet has a good 7-day record and usually holds what it buys. Flippers, which sell within 2 minutes, never count. Raise the minimum to see fewer, better-backed tokens.',
      };
  }
}

/** Says which tokens the lists show (only those bought by conviction wallets) and changes the minimum. */
export function SmartWalletFilterBar({ min, onChange, support }: SmartWalletFilterBarProps) {
  const { title, hint } = copy(support, min);
  return (
    <section className="smart-filter" aria-label="Smart-wallet filter">
      <div className="smart-filter__text">
        <p className="smart-filter__title">{title}</p>
        <p className="smart-filter__hint">{hint}</p>
      </div>
      <div className="smart-filter__control">
        <span className="smart-filter__label" aria-hidden="true">
          Minimum conviction wallets
        </span>
        <SegmentedControl<string>
          label="Minimum conviction wallets"
          value={String(min)}
          options={CONVICTION_WALLET_OPTIONS.map((option) => ({
            value: String(option),
            label: convictionOptionLabel(option),
          }))}
          onChange={(value) => onChange(Number(value))}
        />
      </div>
    </section>
  );
}
