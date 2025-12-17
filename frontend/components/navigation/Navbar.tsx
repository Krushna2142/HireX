'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from '../providers/AuthProvider';
import Avatar from '../ui/Avatar';

const links = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/resume', label: 'Resume' },
  { href: '/mock-interview', label: 'Mock Interview' },
  { href: '/mock-interview/chat', label: 'Chatbot' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            JobCrawler
          </Link>
          <nav className="hidden items-center gap-5 text-sm md:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={[
                    'relative transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {l.label}
                  {active && (
                    <span className="pointer-events-none absolute -bottom-2 left-0 h-[2px] w-full rounded bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {loading ? (
            <span className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">Loading…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-md hover:bg-muted px-2 py-1"
                aria-label="Open dashboard"
                title={user.displayName ?? user.email ?? 'User'}
              >
                <Avatar
                  src={user.photoURL}
                  name={user.displayName ?? user.email ?? 'User'}
                  size={36}
                  className="border border-border"
                />
                {/* Optionally show short name on larger screens */}
                <span className="hidden md:inline-block text-sm text-card-foreground">
                  {user.displayName ?? user.email ?? 'User'}
                </span>
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                onClick={() => signOut().then(() => router.push('/'))}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              onClick={() => signInWithGoogle().then(() => router.push('/dashboard'))}
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}