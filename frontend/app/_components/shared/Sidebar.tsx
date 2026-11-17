'use client';
// frontend/app/_components/shared/Sidebar.tsx
// Floating glass rail · portal account menu (never clipped) · mobile drawer.
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Hexagon, Menu, LayoutDashboard, Briefcase, Bookmark, FileText, Brain,
  ClipboardList, Video, Bell, Target, Mic, Building2, GraduationCap, Plus,
  FolderKanban, Users, Star, CalendarDays, Gift, BarChart3, School, BadgeCheck,
  ListChecks, LineChart, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAlerts } from '@/hooks/useRealTimeAlerts';

type NavItem = { href: string; icon: LucideIcon; label: string; exact?: boolean; alerts?: boolean };
type NavGroup = { label: string; items: NavItem[] };
type AuthShape = {
  user?: { id?: string; fullName?: string | null; full_name?: string | null; name?: string | null; email?: string | null; role?: string | null } | null;
  logout?: () => Promise<void> | void;
  signOut?: () => Promise<void> | void;
};

const CANDIDATE_NAV: NavGroup[] = [
  { label: 'Workspace', items: [
    { href: '/candidate/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/jobs', icon: Briefcase, label: 'Jobs' },
    { href: '/saved-jobs', icon: Bookmark, label: 'Saved Jobs' },
    { href: '/resumes', icon: FileText, label: 'Resume' },
    { href: '/resume-analysis', icon: Brain, label: 'Resume Analysis' },
    { href: '/candidate/applications', icon: ClipboardList, label: 'Applications' },
    { href: '/candidate/interviews', icon: Video, label: 'Interviews' },
    { href: '/alerts', icon: Bell, label: 'Alerts', alerts: true },
  ]},
  { label: 'Campus Hiring', items: [
    { href: '/candidate/campus', icon: GraduationCap, label: 'Campus Jobs', exact: true },
    { href: '/candidate/campus/applications', icon: ClipboardList, label: 'My Applications' },
    { href: '/candidate/campus/offers', icon: Gift, label: 'My Offers' },
  ]},
  { label: 'Discover', items: [
    { href: '/recommendations', icon: Target, label: 'Recommendations' },
    { href: '/mock-interview', icon: Mic, label: 'Mock Interview' },
  ]},
];

const RECRUITER_NAV: NavGroup[] = [
  { label: 'Workspace', items: [
    { href: '/recruiter/dashboard', icon: BarChart3, label: 'Recruitment' },
    { href: '/recruiter/profile', icon: Building2, label: 'Profile' },
    { href: '/recruiter/interviews', icon: Video, label: 'Interviews' },
    { href: '/alerts', icon: Bell, label: 'Alerts', alerts: true },
  ]},
  { label: 'Campus Hiring', items: [
    { href: '/recruiter/campus', icon: GraduationCap, label: 'Overview', exact: true },
    { href: '/recruiter/campus/create', icon: Plus, label: 'Create Drive' },
    { href: '/recruiter/campus/drives', icon: FolderKanban, label: 'My Drives' },
    { href: '/recruiter/campus/applicants', icon: Users, label: 'Applicants' },
    { href: '/recruiter/campus/shortlisted', icon: Star, label: 'Shortlisted' },
    { href: '/recruiter/campus/interviews', icon: CalendarDays, label: 'Interviews' },
    { href: '/recruiter/campus/offers', icon: Gift, label: 'Offers' },
    { href: '/recruiter/campus/analytics', icon: LineChart, label: 'Analytics' },
  ]},
];

const PLACEMENT_NAV: NavGroup[] = [
  { label: 'Workspace', items: [
    { href: '/placement', icon: LayoutDashboard, label: 'Overview', exact: true },
    { href: '/alerts', icon: Bell, label: 'Alerts', alerts: true },
  ]},
  { label: 'Campus Hiring', items: [
    { href: '/placement/jobs', icon: Briefcase, label: 'Campus Jobs' },
    { href: '/placement/drives', icon: FolderKanban, label: 'Active Drives' },
    { href: '/placement/students', icon: School, label: 'Students' },
    { href: '/placement/eligibility', icon: BadgeCheck, label: 'Eligibility Checker' },
    { href: '/placement/applications', icon: ClipboardList, label: 'Applications' },
    { href: '/placement/shortlisting', icon: ListChecks, label: 'Shortlisting' },
    { href: '/placement/tracking', icon: LineChart, label: 'Placement Tracking' },
    { href: '/placement/offers', icon: Gift, label: 'Offers' },
    { href: '/placement/analytics', icon: BarChart3, label: 'Analytics' },
  ]},
];

const COLLAPSE_KEY = 'hx_sidebar_collapsed';
const spring = { type: 'spring', stiffness: 380, damping: 32 } as const;

function normalizeRole(role?: string | null) {
  const v = String(role ?? '').toLowerCase();
  if (v === 'jobseeker' || v === 'job_seeker' || v === 'candidate') return 'candidate';
  return v || 'candidate';
}
function getUserName(user: AuthShape['user']) {
  return user?.fullName ?? user?.full_name ?? user?.name ?? user?.email?.split('@')[0] ?? 'User';
}
function isActivePath(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function RecruiterStats({ collapsed }: { collapsed: boolean }) {
  const [stats, setStats] = useState<{ activeJobs: number; newApplicants: number } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jc_recruiter_stats');
      if (!raw) return;
      const p = JSON.parse(raw) as { activeJobs?: number; newApplicants?: number };
      setStats({ activeJobs: Number(p.activeJobs ?? 0), newApplicants: Number(p.newApplicants ?? 0) });
    } catch { setStats(null); }
  }, []);
  if (!stats || collapsed) return null;
  return (
    <div className="hx-stats">
      <div><strong style={{ color: '#F472B6' }}>{stats.activeJobs}</strong><span>active</span></div>
      <div><strong style={{ color: '#38BDF8' }}>{stats.newApplicants}</strong><span>applicants</span></div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth() as unknown as AuthShape;
  const { unreadCount } = useAlerts();

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 12, bottom: 12 });
  const accountRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => {
      setIsMobile(mq.matches);
      if (mq.matches) setMobileOpen(false);
      else setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  useEffect(() => { if (!isMobile) localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); }, [collapsed, isMobile]);
  useEffect(() => { setMenuOpen(false); setMobileOpen(false); }, [pathname]);

  const user = auth.user;
  const role = normalizeRole(user?.role);
  const isRecruiter = role === 'recruiter';
  const isPlacement = role === 'college_admin' || role === 'tpo' || role === 'placement_coordinator';
  const groups = useMemo(() => (isRecruiter ? RECRUITER_NAV : isPlacement ? PLACEMENT_NAV : CANDIDATE_NAV), [isRecruiter, isPlacement]);
  const userName = getUserName(user);
  const initial = userName.trim().charAt(0).toUpperCase() || 'U';
  const roleLabel = isRecruiter ? 'Recruiter' : isPlacement ? 'Placement Cell' : 'Candidate';
  const cta = isRecruiter
    ? { href: '/recruiter/campus/create', icon: Plus, label: 'Create Campus Drive' }
    : isPlacement
      ? { href: '/placement/students', icon: School, label: 'Manage Students' }
      : { href: '/candidate/campus', icon: GraduationCap, label: 'Campus Jobs' };

  const rail = isMobile ? false : collapsed;

  const openMenu = () => {
    const r = accountRef.current?.getBoundingClientRect();
    if (r) {
      const width = 224;
      setMenuPos({
        left: Math.max(10, Math.min(r.left, window.innerWidth - width - 10)),
        bottom: Math.max(10, window.innerHeight - r.top + 8),
      });
    }
    setMenuOpen((v) => !v);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      if (auth.logout) await auth.logout();
      else if (auth.signOut) await auth.signOut();
      else { localStorage.removeItem('jc_token'); localStorage.removeItem('user'); window.location.href = '/'; }
    } catch { localStorage.removeItem('jc_token'); localStorage.removeItem('user'); window.location.href = '/'; }
  };

  const asideStyle: CSSProperties = isMobile
    ? { position: 'fixed', top: 10, bottom: 10, left: 10, width: 'min(300px, 86vw)', borderRadius: 22, zIndex: 90 }
    : { position: 'sticky', top: 14, height: 'calc(100vh - 28px)', margin: '14px 0 14px 14px', borderRadius: 22 };

  return (
    <>
      <style>{`
        .hx-side{display:flex;flex-direction:column;background:linear-gradient(180deg,rgba(13,18,32,.92),rgba(8,11,20,.96));
          backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.08);
          box-shadow:0 24px 70px rgba(0,0,0,.45);overflow:hidden;font-family:'Sora',sans-serif;flex-shrink:0;}
        .hx-nav{position:relative;flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 12px 8px;display:flex;flex-direction:column;gap:3px;
          scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.10) transparent;}
        .hx-nav::-webkit-scrollbar{width:4px}.hx-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:99px}
        .hx-group{margin:14px 12px 6px;font-size:10px;letter-spacing:.14em;font-weight:800;color:rgba(226,232,240,.32);text-transform:uppercase;white-space:nowrap;}
        .hx-sep{height:1px;margin:10px 14px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);flex-shrink:0;}
        .hx-item{position:relative;display:flex;align-items:center;height:42px;border-radius:13px;color:rgba(226,232,240,.66);
          text-decoration:none;white-space:nowrap;transition:color .18s ease,background .18s ease;}
        .hx-item:hover{color:#F1F5F9;background:rgba(255,255,255,.05);}
        .hx-pill{position:absolute;inset:0;border-radius:13px;background:linear-gradient(135deg,rgba(56,189,248,.16),rgba(167,139,250,.14));
          border:1px solid rgba(56,189,248,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 8px 24px rgba(56,189,248,.12);}
        .hx-bar{position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:99px;background:linear-gradient(180deg,#38BDF8,#A78BFA);box-shadow:0 0 12px rgba(56,189,248,.7);}
        .hx-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:13.5px;font-weight:700;}
        .hx-tip{position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%) scale(.96);opacity:0;pointer-events:none;
          background:#0B1020;border:1px solid rgba(148,163,184,.25);color:#E2E8F0;padding:6px 10px;border-radius:9px;font-size:11px;
          font-weight:700;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.45);transition:opacity .15s ease,transform .15s ease;z-index:120;}
        .hx-item:hover .hx-tip,.hx-acct:hover .hx-tip{opacity:1;transform:translateY(-50%) scale(1);}
        .hx-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;
          background:rgba(124,58,237,.35);border:1px solid rgba(167,139,250,.4);color:#C4B5FD;font-size:10px;font-weight:800;flex-shrink:0;}
        .hx-dot{position:absolute;top:8px;right:10px;width:7px;height:7px;border-radius:50%;background:#F472B6;box-shadow:0 0 10px rgba(244,114,182,.85);}
        .hx-stats{margin:10px 10px 0;padding:10px 12px;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px;
          border:1px solid rgba(244,114,182,.22);background:rgba(244,114,182,.07);color:rgba(226,232,240,.55);white-space:nowrap;}
        .hx-bottom{position:relative;padding:12px;border-top:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column;gap:10px;}
        .hx-cta{display:flex;align-items:center;justify-content:center;gap:8px;height:44px;border-radius:13px;text-decoration:none;
          border:1px solid rgba(244,114,182,.28);background:linear-gradient(135deg,rgba(56,189,248,.14),rgba(244,114,182,.16));
          color:#F8FAFC;font-weight:800;font-size:12.5px;white-space:nowrap;transition:filter .18s ease,transform .18s ease;}
        .hx-cta:hover{filter:brightness(1.15);transform:translateY(-1px);}
        .hx-acct{position:relative;display:flex;align-items:center;gap:11px;width:100%;padding:9px;border-radius:14px;cursor:pointer;
          border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:#E2E8F0;font-family:'Sora',sans-serif;transition:background .18s ease;}
        .hx-acct:hover{background:rgba(255,255,255,.07);}
        .hx-avatar{width:38px;height:38px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#7C3AED,#8B5CF6);color:#fff;font-weight:900;font-size:14px;box-shadow:0 6px 18px rgba(124,58,237,.35);}
        .hx-menu{position:fixed;width:224px;padding:8px;border-radius:14px;z-index:200;border:1px solid rgba(255,255,255,.10);
          background:rgba(11,16,32,.97);backdrop-filter:blur(18px);box-shadow:0 20px 60px rgba(0,0,0,.5);display:grid;gap:6px;}
        .hx-menu a,.hx-menu button{display:flex;align-items:center;gap:9px;border:none;background:transparent;color:#CBD5E1;font-size:12.5px;
          font-weight:800;padding:10px 12px;border-radius:10px;cursor:pointer;text-decoration:none;font-family:'Sora',sans-serif;width:100%;text-align:left;}
        .hx-menu a:hover,.hx-menu button:hover{background:rgba(255,255,255,.06);color:#F8FAFC;}
        .hx-fab{position:fixed;top:14px;left:14px;z-index:95;width:44px;height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.14);
          background:rgba(11,16,32,.92);backdrop-filter:blur(14px);color:#E2E8F0;display:grid;place-items:center;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.4);}
        .hx-backdrop{position:fixed;inset:0;z-index:88;background:rgba(2,6,23,.6);backdrop-filter:blur(2px);}
        .hx-collapse{display:flex;align-items:center;justify-content:center;gap:8px;height:36px;border-radius:11px;cursor:pointer;
          border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);color:rgba(226,232,240,.7);font-family:'Sora',sans-serif;
          font-size:11px;font-weight:800;transition:background .18s ease;}
        .hx-collapse:hover{background:rgba(255,255,255,.09);}
      `}</style>

      {isMobile && !mobileOpen && (
        <button type="button" className="hx-fab" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
        </button>
      )}
      {isMobile && mobileOpen && <div className="hx-backdrop" onClick={() => setMobileOpen(false)} />}

      <motion.aside
        className="hx-side"
        style={asideStyle}
        animate={isMobile ? { x: mobileOpen ? 0 : -340 } : { width: collapsed ? 78 : 268 }}
        initial={false}
        transition={spring}
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 62, flexShrink: 0,
          padding: rail ? 0 : '0 16px', justifyContent: rail ? 'center' : 'flex-start' }}>
          <motion.div whileHover={{ rotate: -8, scale: 1.06 }}
            style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', flexShrink: 0,
              background: 'linear-gradient(135deg,#38BDF8,#7C3AED)', boxShadow: '0 8px 22px rgba(56,189,248,.35)' }}>
            <Hexagon size={18} color="#fff" strokeWidth={2.4} />
          </motion.div>
          <AnimatePresence>
            {!rail && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                style={{ fontSize: 15, fontWeight: 900, letterSpacing: '-.02em',
                  background: 'linear-gradient(90deg,#F8FAFC,#7DD3FC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                HireX
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="hx-nav">
          {groups.map((group) => (
            <div key={group.label} style={{ display: 'contents' }}>
              {rail ? <div className="hx-sep" /> : <p className="hx-group">{group.label}</p>}
              {group.items.map((item) => {
                const active = isActivePath(pathname, item);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="hx-item" aria-current={active ? 'page' : undefined}
                    style={{ justifyContent: rail ? 'center' : 'flex-start', padding: rail ? 0 : '0 12px', gap: 12 }}>
                    {active && <motion.span layoutId="hx-nav-pill" className="hx-pill" transition={spring} />}
                    {active && <motion.span layoutId="hx-nav-bar" className="hx-bar" transition={spring} />}
                    <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 20, flexShrink: 0, zIndex: 1 }}>
                      <Icon size={19} strokeWidth={active ? 2.4 : 2}
                        style={{ color: active ? '#7DD3FC' : undefined, filter: active ? 'drop-shadow(0 0 8px rgba(56,189,248,.55))' : undefined, transition: 'color .18s, filter .18s' }} />
                    </span>
                    <AnimatePresence initial={false}>
                      {!rail && (
                        <motion.span className="hx-label" style={{ zIndex: 1 }} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {item.alerts && unreadCount > 0 && !rail && <span className="hx-badge" style={{ zIndex: 1 }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                    {item.alerts && unreadCount > 0 && rail && <span className="hx-dot" />}
                    {rail && <span className="hx-tip">{item.label}</span>}
                  </Link>
                );
              })}
              {isRecruiter && group.label === 'Workspace' && <RecruiterStats collapsed={rail} />}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="hx-bottom">
          {!isMobile && (
            <button type="button" className="hx-collapse" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={spring} style={{ display: 'grid', placeItems: 'center' }}>
                <Hexagon size={0} style={{ display: 'none' }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6-6 6 6 6" /><path d="m15 6 6 6-6 6" />
                </svg>
              </motion.span>
              {!rail && <span>{collapsed ? '' : 'Collapse'}</span>}
            </button>
          )}

          <Link href={cta.href} className="hx-cta" style={rail ? { width: 44, margin: '0 auto', padding: 0 } : undefined}>
            <cta.icon size={17} strokeWidth={2.6} />
            <AnimatePresence initial={false}>
              {!rail && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>{cta.label}</motion.span>}
            </AnimatePresence>
          </Link>

          <div style={{ position: 'relative' }}>
            <button ref={accountRef} type="button" className="hx-acct" onClick={openMenu}
              aria-haspopup="menu" aria-expanded={menuOpen}
              style={{ justifyContent: rail ? 'center' : 'flex-start', padding: rail ? 5 : 9 }}>
              <span className="hx-avatar">{initial}</span>
              <AnimatePresence initial={false}>
                {!rail && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <strong style={{ display: 'block', fontSize: 12.5, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</strong>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.38)' }}>{roleLabel}</span>
                  </motion.span>
                )}
              </AnimatePresence>
              {!rail && <span style={{ color: 'rgba(255,255,255,.35)', fontSize: 11 }}>▾</span>}
              {rail && <span className="hx-tip">{userName}</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Account menu — portaled so the rail can never clip it */}
      {menuOpen && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 190 }} onClick={() => setMenuOpen(false)} />
          <motion.div className="hx-menu" initial={{ opacity: 0, y: 8, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: .97 }} transition={{ duration: .16 }}
            style={{ left: menuPos.left, bottom: menuPos.bottom }}>
            <Link href="/settings" onClick={() => setMenuOpen(false)}><Settings size={14} /> Settings</Link>
            <button type="button" onClick={() => void handleLogout()} style={{ color: '#FCA5A5' }}><LogOut size={14} /> Sign out</button>
          </motion.div>
        </>,
        document.body,
      )}
    </>
  );
}