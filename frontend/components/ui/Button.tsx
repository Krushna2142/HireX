'use client';

import * as React from 'react';
import { cn } from '../../lib/utils/cn';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'secondary' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 active:scale-[.99]',
  outline: 'border border-border bg-background hover:bg-muted active:scale-[.99]',
  ghost: 'bg-transparent hover:bg-muted active:scale-[.99]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[.99]',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[.99]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6',
  icon: 'h-9 w-9 p-0 inline-flex items-center justify-center',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
