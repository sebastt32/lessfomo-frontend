import { useCallback, useEffect, useState } from 'react';
import { applyTheme, readStoredTheme, storeTheme, type ThemeChoice } from '../lib/theme';

/** The color theme choice, applied to the page and remembered across visits. */
export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [theme, setThemeState] = useState<ThemeChoice>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((choice: ThemeChoice) => {
    storeTheme(choice);
    setThemeState(choice);
  }, []);

  return [theme, setTheme];
}
