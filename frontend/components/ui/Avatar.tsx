import React from 'react';

export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white shadow-md">
      {initials}
    </div>
  );
}