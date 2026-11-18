import type { SmartWalletSupport } from '../../state/smartWalletFeed';
import {
  CONVICTION_WALLET_OPTIONS,
  convictionOptionLabel,
  describeConvictionFilter,
} from '../../lib/smartWalletFilter';
import { HelpTip } from '../molecules/HelpTip';
import { SegmentedControl } from '../molecules/SegmentedControl';
import './SmartWalletFilterBar.css';

export interface SmartWalletFilterBarProps {
  min: number;
  onChange: (min: number) => void;
  support: SmartWalletSupport;
}

function copy(support: SmartWalletSupport, min: number): { title: string; hint: string; explained: boolean } {
  switch (support) {
    case 'unavailable':
      return {
        title: 'Mostrando todos los tokens: todavía no hay datos de wallets',
        hint: 'Este servidor todavía no informa las wallets con buen historial, así que las listas no se filtran. Se filtrarán cuando se actualice el servidor.',
        explained: false,
      };
    case 'no-conviction':
      return {
        title: 'Mostrando los tokens públicos del screener: todavía no hay datos de wallets que mantienen',
        hint: 'Este servidor todavía no informa las wallets que mantienen, así que las listas muestran lo que publica, sin el mínimo. Se filtrarán cuando se actualice el servidor.',
        explained: true,
      };
    default:
      return {
        title: describeConvictionFilter(min),
        hint: 'Una wallet que vende rápido (en menos de 2 minutos) nunca cuenta. Sube el mínimo para ver menos tokens, con más respaldo.',
        explained: true,
      };
  }
}

/** Says which tokens the lists show (only those bought by conviction wallets) and changes the minimum. */
export function SmartWalletFilterBar({ min, onChange, support }: SmartWalletFilterBarProps) {
  const { title, hint, explained } = copy(support, min);
  return (
    <section className="smart-filter" aria-label="Filtro de wallets">
      <div className="smart-filter__text">
        <p className="smart-filter__title">
          {title}
          {explained ? (
            <HelpTip topic="una wallet que mantiene">
              Una wallet con buen historial en los últimos 7 días que suele quedarse con lo que compra, en vez de
              venderlo en menos de 2 minutos. Un token aparece en lessfomo solo cuando al menos 3 lo compraron.
            </HelpTip>
          ) : null}
        </p>
        <p className="smart-filter__hint">{hint}</p>
      </div>
      <div className="smart-filter__control">
        <span className="smart-filter__label" aria-hidden="true">
          Mínimo de wallets que mantienen
        </span>
        <SegmentedControl<string>
          label="Mínimo de wallets que mantienen"
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
