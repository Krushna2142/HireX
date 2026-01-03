/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from '../providers/AuthProvider';
import Avatar from '../ui/Avatar';

const publicLinks = [
  { href: '/', label: 'Home' },
  { href: '/resume', label: 'Resume' },
];

const privateLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/mock-interview', label: 'Mock Interview' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  // ✅ FIX: use signOutUser (NOT signOut)
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            JobCrawler
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            {publicLinks.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}

            {user &&
              privateLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {loading ? (
            <span className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
              Loading…
            </span>
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
                <span className="hidden md:inline-block text-sm text-card-foreground">
                  {user.displayName ?? user.email ?? 'User'}
                </span>
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                onClick={async () => {
                  await signOutUser();
                  router.push('/');
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
              onClick={async () => {
                await signInWithGoogle();
                router.push('/dashboard');
              }}
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
