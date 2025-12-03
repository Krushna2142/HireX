'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
        'placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';