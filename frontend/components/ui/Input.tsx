import React from 'react';

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className,
  ...rest
}) => (
  <input
    className={`w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand ${className ?? ''}`}
    {...rest}
  />
);