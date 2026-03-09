'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from '../providers/AuthProvider';
import Avatar from '../ui/Avatar';
import LoginModal from '@/components/auth/CredentialsModal';
import { Button } from '@/components/ui/Button';

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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-border bg-background transition-all duration-300 ${scrolled ? 'py-2 shadow-sm' : 'py-4'
          }`}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">

            {/* Logo */}
            <Link href="/" className="text-lg font-semibold tracking-tight">
              JobCrawler
            </Link>

            {/* Desktop Nav */}
            <nav className="relative ml-12 hidden md:flex items-center gap-8 text-sm">
              {[...publicLinks, ...(user ? privateLinks : [])].map((l) => (
                <div key={l.href} className="relative">
                  <Link
                    href={l.href}
                    className={`relative px-1 py-1 transition ${isActive(l.href)
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {l.label}

                    {isActive(l.href) && (
                      <motion.span
                        layoutId="activeIndicator"
                        className="absolute -bottom-2 left-0 h-[2px] w-full bg-primary rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                </div>
              ))}
            </nav>

            {/* Right Section */}
            <div className="ml-auto flex items-center gap-4">

              <ThemeToggle />

              {/* Desktop Auth */}
              <div className="hidden md:flex items-center gap-3">
                {loading ? (
                  <span className="text-sm text-muted-foreground">Loading…</span>
                ) : user ? (
                  <>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted transition"
                    >
                      <Avatar
                        src={user.user_metadata?.avatar_url ?? undefined}
                        name={
                          user.user_metadata?.full_name ??
                          user.email ??
                          'User'
                        }
                        size={34}
                        className="border border-border"
                      />
                    </button>

                    {/* Glass Button */}
                    <button
                      onClick={async () => {
                        await signOutUser();
                        router.push('/');
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium
                      bg-white/10 backdrop-blur-md
                      border border-white/20
                      hover:bg-white/20
                      transition"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={signInWithGoogle}
                    className="rounded-lg px-4 py-2 text-sm font-medium
                    bg-white/10 backdrop-blur-md
                    border border-white/20
                    hover:bg-white/20
                    transition"
                  >
                    Sign in
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-md hover:bg-muted transition"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Animated Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden border-t border-border bg-background px-6 pb-6 pt-4 space-y-4"
            >
              {[...publicLinks, ...(user ? privateLinks : [])].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}