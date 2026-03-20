/* eslint-disable react-hooks/set-state-in-effect */
// frontend/components/ThemeToggle.tsx
'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false); // Client-side only
  const [hasMounted, setHasMounted] = useState(false); // To handle hydration issues

  useEffect(() => {
    setHasMounted(true); // Mark component as mounted (on client)
    
    // Initialize theme based on local storage or default to system theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  if (!hasMounted) {
    // Avoid rendering anything on the server
    return null;
  }

  const handleThemeToggle = () => {
    // Toggle theme
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);

    // Apply the theme to the document element
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={handleThemeToggle}
      className="btn btn-secondary px-3 py-1"
      title={isDark ? 'Switch to light' : 'Switch to dark'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="ml-2">{isDark ? 'Light' : 'Dark'}</span>
    </button>
  );
}
