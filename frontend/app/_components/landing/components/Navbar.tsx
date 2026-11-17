import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenGetStarted: () => void;
}

const NAV_LINKS = [
  { label: 'Platform', href: '#chapter-01' },
  { label: 'Modules', href: '#chapter-02' },
  { label: 'Campus', href: '#chapter-08' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar({ onOpenGetStarted }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-slate-800/70 bg-[#04070D]/90">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-8 px-5 sm:px-8">
        {/* Zone 1: Brand Wordmark (Single Text Element) */}
        <a
          href="#hero"
          className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          HIREX
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative py-1 whitespace-nowrap shrink-0 transition-colors duration-200 hover:text-white after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-cyan-400 after:transition-all after:duration-200 hover:after:w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenGetStarted}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 whitespace-nowrap shrink-0 transition-transform duration-200 hover:bg-cyan-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 cursor-pointer"
          >
            Get Started
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-200 md:hidden focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="border-t border-slate-800/80 bg-[#04070D] px-5 py-4 md:hidden">
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-slate-200 hover:text-cyan-300"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenGetStarted();
              }}
              className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 cursor-pointer"
            >
              Get Started
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
