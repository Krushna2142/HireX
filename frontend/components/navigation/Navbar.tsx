'use client';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-neutral-950/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            JobIntelligence
          </Link>
          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link href="/jobs" className="opacity-80 hover:opacity-100">
              Jobs
            </Link>
            <Link href="/dashboard" className="opacity-80 hover:opacity-100">
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}