'use client';
import { useEffect } from 'react';
export function DebugMount() {
  useEffect(() => {
    console.log('DebugMount mounted – provider tree alive');
  }, []);
  return null;
}
