'use client';
// frontend/hooks/useMediaQuery.ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useIsMobile(breakpoint = 900): boolean {
  return useMediaQuery(`(max-width: ${breakpoint}px)`);
}