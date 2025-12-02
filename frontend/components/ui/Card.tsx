import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => (
  <div className={`rounded border p-4 shadow-sm bg-white dark:bg-neutral-900 ${className ?? ''}`} {...rest} />
);