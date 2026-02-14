'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from '../providers/AuthProvider';
import Avatar from '../ui/Avatar';
import { useState } from 'react';
import LoginModal from '@/components/auth/CredentialsModal';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';

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
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      setLoginOpen(true);
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">

          {/* Logo */}
          <Link href="/" className="text-lg font-semibold tracking-tight">
            JobCrawler
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {publicLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-foreground transition"
              >
                {l.label}
              </Link>
            ))}

            {user &&
              privateLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="hover:text-foreground transition"
                >
                  {l.label}
                </Link>
              ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            <ThemeToggle />

            {/* Desktop Auth */}
            <div className="hidden md:flex items-center gap-3">
              {loading ? (
                <span className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                  Loading…
                </span>
              ) : user ? (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 rounded-md hover:bg-muted px-2 py-1"
                  >
                    <Avatar
                      src={user.photoURL}
                      name={user.displayName ?? user.email ?? 'User'}
                      size={36}
                      className="border border-border"
                    />
                    <span className="text-sm hidden lg:inline">
                      {user.displayName ?? user.email}
                    </span>
                  </button>

                  <button
                    className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                    onClick={async () => {
                      await signOutUser();
                      router.push('/');
                    }}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Button onClick={handleSignIn} disabled={loading}>
                  Sign in
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-3 space-y-3">

            {publicLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={closeMobile}
                className="block text-sm hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}

            {user &&
              privateLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMobile}
                  className="block text-sm hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}

            <div className="pt-3 border-t border-border">
              {loading ? (
                <span className="text-sm text-muted-foreground">
                  Loading…
                </span>
              ) : user ? (
                <>
                  <button
                    onClick={() => {
                      router.push('/dashboard');
                      closeMobile();
                    }}
                    className="block w-full text-left text-sm py-2"
                  >
                    Dashboard
                  </button>

                  <button
                    onClick={async () => {
                      await signOutUser();
                      router.push('/');
                      closeMobile();
                    }}
                    className="block w-full text-left text-sm py-2 text-red-500"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    handleSignIn();
                    closeMobile();
                  }}
                  className="w-full"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
