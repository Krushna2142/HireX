'use client';
// frontend/components/ui/Avatar.tsx
import React, { useState, useMemo } from 'react';

export default function Avatar({
  src,
  name,
  size = 32,
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  const initials = useMemo(() => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [name]);

  // defensive: if src is empty string treat as missing
  const hasSrc = !!src && src !== '' && !errored;

  return (
    <div
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground',
        className,
      ].join(' ')}
      style={{ width: size, height: size }}
      title={name ?? 'User'}
    >
      {hasSrc ? (
        <img
          src={src as string}
          alt={name ?? 'avatar'}
          onError={() => {
            // show fallback
            setErrored(true);
            // helpful debugging
            // eslint-disable-next-line no-console
            console.warn('[Avatar] failed to load image src:', src);
          }}
          className="h-full w-full object-cover"
          decoding="async"
        />
      ) : initials ? (
        <span className="select-none text-sm font-medium">{initials}</span>
      ) : (
        // neutral SVG icon fallback
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="h-full w-full"
        >
          <rect width="24" height="24" rx="999" fill="currentColor" opacity="0.06" />
          <path
            d="M12 12c2.485 0 4.5-2.015 4.5-4.5S14.485 3 12 3 7.5 5.015 7.5 7.5 9.515 12 12 12zM4.5 19.5a7.5 7.5 0 0 1 15 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </svg>
      )}
    </div>
  );
}