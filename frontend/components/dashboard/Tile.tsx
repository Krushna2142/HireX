'use client';

import Link from 'next/link';

export function Tile({
  icon,
  title,
  desc,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-border bg-card p-4 shadow-soft transition-transform duration-200 hover:-translate-y-[2px] hover:shadow-lift">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
          {icon}
        </div>
        <div className="font-medium text-card-foreground">{title}</div>
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}