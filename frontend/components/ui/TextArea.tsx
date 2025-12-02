import React from 'react';
import { cn } from '@/lib/utils/cn';

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({
  className,
  ...rest
}) => (
  <textarea
    className={cn(
      'w-full rounded-md border bg-white/80 px-3 py-2 text-sm shadow-sm ring-1 ring-black/10 placeholder:text-black/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-neutral-900/80 dark:placeholder:text-white/50 dark:ring-white/10',
      className
    )}
    {...rest}
  />
);