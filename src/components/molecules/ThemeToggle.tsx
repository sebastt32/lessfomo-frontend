import type { ThemeChoice } from '../../lib/theme';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';

const OPTIONS: readonly SegmentedOption<ThemeChoice>[] = [
  { value: 'system', label: 'Auto', hint: 'Sigue la configuración de tu dispositivo' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export interface ThemeToggleProps {
  theme: ThemeChoice;
  onChange: (theme: ThemeChoice) => void;
}

/** Chooses between following the device theme, light and dark. */
export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return <SegmentedControl label="Tema de color" options={OPTIONS} value={theme} onChange={onChange} />;
}
