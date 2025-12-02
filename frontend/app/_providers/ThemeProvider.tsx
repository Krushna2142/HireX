/* eslint-disable react-hooks/set-state-in-effect */
'use client';
import { useEffect, useState } from 'react';
import { useTheme } from '../../features/jobs/hooks/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    setMounted(true);
  }, [theme]);

  if (!mounted) return <div style={{ opacity: 0 }}>{children}</div>;
  return <>{children}</>;
}