'use client';
// frontend/components/navigation/MegaMenu.tsx
import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  Linkedin,
  Sparkles,
  Video,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

type Item = {
  title: string;
  desc: string;
  href: string;
  icon: React.ReactNode;
  badge?: { label: string; color: 'green' | 'orange' };
};

const items: Item[] = [
  {
    title: 'Job Tracker',
    desc: 'Track and manage your job search all in one place.',
    href: '/dashboard',
    icon: <ClipboardList className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Job autofill',
    desc: 'Autofill forms and apply faster to jobs that match your profile.',
    href: '/jobs',
    icon: <Briefcase className="h-5 w-5 text-primary" />,
  },
  {
    title: 'AI Cover Letter',
    desc: 'Create personalized cover letters that match job descriptions.',
    href: '/resume',
    icon: <FileText className="h-5 w-5 text-primary" />,
    badge: { label: 'Trending', color: 'green' },
  },
  {
    title: 'Resume Optimizer',
    desc: 'Improve your resume to pass role and ATS scans easily.',
    href: '/resume',
    icon: <Sparkles className="h-5 w-5 text-primary" />,
  },
  {
    title: 'LinkedIn Optimizer',
    desc: 'Enhance your LinkedIn to attract recruiters.',
    href: '/recommendations',
    icon: <Linkedin className="h-5 w-5 text-primary" />,
    badge: { label: 'New!', color: 'orange' },
  },
  {
    title: 'AI Mock Interview',
    desc: 'Simulate real interviews and get instant feedback.',
    href: '/mock-interview/chat',
    icon: <Video className="h-5 w-5 text-primary" />,
    badge: { label: 'New!', color: 'orange' },
  },
];

export default function MegaMenu() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Portal mount check (avoids SSR errors)
  React.useEffect(() => setMounted(true), []);

  // Compute and clamp panel position relative to viewport
  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const margin = 12; // viewport side margin
    const vw = window.innerWidth;
    const panelWidth = Math.min(1024, vw - margin * 2); // up to 64rem
    const center = r.left + r.width / 2;
    const left = Math.max(margin, Math.min(center - panelWidth / 2, vw - margin - panelWidth));
    const top = r.bottom + 8; // 8px gap below trigger
    setPos({ top, left, width: panelWidth });
  }, []);

  // Reposition when opening, resizing, or scrolling
  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  // Hover intent timers to prevent flicker
  const openTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), 80);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  React.useEffect(() => () => clearTimers(), []);

  return (
    <div
      ref={anchorRef}
      className="relative inline-flex"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition',
          open ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        ].join(' ')}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          } else if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'ArrowDown') {
            setOpen(true);
          }
        }}
      >
        Features
        <ChevronDown
          className={['h-4 w-4 transition-transform duration-200', open ? 'rotate-180' : 'rotate-0'].join(
            ' '
          )}
        />
      </button>

      {/* Portal panel, fixed to viewport and anchored under trigger */}
      {mounted &&
        createPortal(
          <div
            onMouseEnter={scheduleOpen}
            onMouseLeave={scheduleClose}
            className={[
              'fixed z-50 transition-opacity duration-150',
              open ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {/* Arrow (caret) */}
            <div
              className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm border border-border bg-popover"
              aria-hidden
            />

            {/* Panel */}
            <div className="rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 backdrop-blur">
              <div className="grid gap-6 p-6 md:grid-cols-2">
                {items.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex items-start gap-4 rounded-xl border border-transparent p-4 transition hover:border-border hover:bg-muted/60"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-base font-semibold group-hover:text-foreground">
                          {item.title}
                        </div>
                        {item.badge ? (
                          <span
                            className={[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                              item.badge.color === 'green'
                                ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                                : 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
                            ].join(' ')}
                          >
                            {item.badge.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <Link
                  href="/features"
                  className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm transition hover:bg-muted/70"
                  onClick={() => setOpen(false)}
                >
                  <span>All Features</span>
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
