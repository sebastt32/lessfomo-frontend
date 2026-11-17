import type { ThemeChoice } from '../../lib/theme';
import { SegmentedControl, type SegmentedOption } from './SegmentedControl';

const OPTIONS: readonly SegmentedOption<ThemeChoice>[] = [
  { value: 'system', label: 'Auto', hint: 'Follow your device setting' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export interface ThemeToggleProps {
  theme: ThemeChoice;
  onChange: (theme: ThemeChoice) => void;
}

/** Chooses between following the device theme, light and dark. */
export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return <SegmentedControl label="Color theme" options={OPTIONS} value={theme} onChange={onChange} />;
}
