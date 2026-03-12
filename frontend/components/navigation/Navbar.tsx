'use client';
// frontend/components/navigation/Navbar.tsx
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from '../providers/AuthProvider';
import Avatar from '../ui/Avatar';
import { Button } from '@/components/ui/Button';
import CredentialsModal from '@/components/auth/CredentialsModal';

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
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const links = isAuthenticated
    ? [...publicLinks, ...privateLinks]
    : publicLinks;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Job Crawler
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition ${
                    pathname === link.href
                      ? 'text-blue-600'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />

              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Avatar name={user?.full_name || 'U'} />
                  <Button variant="ghost" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button size="sm" onClick={() => setShowModal(true)}>
                  Sign In
                </Button>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-3 space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block py-2 text-sm text-gray-700 dark:text-gray-300"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <CredentialsModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}