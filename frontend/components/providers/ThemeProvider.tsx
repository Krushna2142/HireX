'use client';// frontend/components/providers/ThemeProvider.tsx

import { ThemeProvider } from 'next-themes';

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="jobcrawler-theme">
      {children}
    </ThemeProvider>
  );
}
export { ThemeProvider };
