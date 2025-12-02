/* eslint-disable react-hooks/set-state-in-effect */
'use client';
import { useEffect, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('ji-theme', 'light');
  const [theme, setTheme] = useState<Theme>(storedTheme);

  // Sync theme with storedTheme when it changes (after localStorage loads)
  useEffect(() => {
    setTheme(storedTheme);
  }, [storedTheme]);

  // Check system preference if no stored theme
  useEffect(() => {
    const hasStored = typeof window !== 'undefined' && localStorage.getItem('ji-theme');
    if (!hasStored) {
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    setStoredTheme(theme);
  }, [theme, setStoredTheme]);

  function toggle() {
    setTheme(t => (t === 'light' ? 'dark' : 'light'));
  }

  return { theme, toggle, setTheme };
}
