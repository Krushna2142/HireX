import React from 'react';
import { cn } from '@/lib/utils/cn';
// frontend/components/ui/Badge.tsx
export function Badge({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200',
        className
      )}
    >
      {children}
    </span>
  );
}
