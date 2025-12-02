import React from 'react';
import { cn } from '@/lib/utils/cn';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
};

export const Button: React.FC<Props> = ({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base'
  } as const;
  const variants = {
    primary:
      'bg-indigo-600 text-white shadow hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
    outline:
      'border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900/40',
    ghost: 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-indigo-900/40',
    destructive:
      'bg-red-600 text-white shadow hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500'
  } as const;
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition',
        sizes[size],
        variants[variant],
        className
      )}
      {...rest}
    />
  );
};