import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
};

export const Button: React.FC<Props> = ({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm'
  } as const;

  const styles = {
    primary:
      'bg-brand text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
    outline:
      'border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-900/30',
    ghost: 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-200 dark:hover:bg-white/10'
  } as const;

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md transition ${sizes[size]} ${styles[variant]} ${className ?? ''}`}
      {...rest}
    />
  );
};