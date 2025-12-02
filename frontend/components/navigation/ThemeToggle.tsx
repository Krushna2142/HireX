'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/_providers/ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}