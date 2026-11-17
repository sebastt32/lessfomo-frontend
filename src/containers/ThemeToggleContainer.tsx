import { ThemeToggle } from '../components/molecules/ThemeToggle';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggleContainer() {
  const [theme, setTheme] = useTheme();
  return <ThemeToggle theme={theme} onChange={setTheme} />;
}
