'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/resume', label: 'Resume' },
  { href: '/interview', label: 'Mock Interview' },
  { href: '/settings', label: 'Settings' },
  { href: '/dashboard', label: 'Dashboard' }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur dark:bg-neutral-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            JobIntelligence
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative transition ${
                  pathname === l.href ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {l.label}
                {pathname === l.href && (
                  <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            className="md:hidden inline-flex items-center rounded-md border px-2 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t bg-white/95 px-4 py-4 dark:bg-neutral-950/95">
          <div className="grid gap-3 text-sm">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded px-3 py-2 ${
                  pathname === l.href
                    ? 'bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                    : 'hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}