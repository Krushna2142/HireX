'use client';

// frontend/app/_components/shared/Sidebar.tsx

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/components/providers/AuthProvider';
import { useAlerts } from '@/hooks/useRealTimeAlerts';

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type AuthShape = {
  user?: {
    id?: string;
    fullName?: string | null;
    full_name?: string | null;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  logout?: () => Promise<void> | void;
  signOut?: () => Promise<void> | void;
};

const CANDIDATE_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/candidate/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs', icon: '💼', label: 'Jobs' },
      { href: '/saved-jobs', icon: '🔖', label: 'Saved Jobs' },
      { href: '/resumes', icon: '📄', label: 'Resume' },
      { href: '/resume-analysis', icon: '🧠', label: 'Resume Analysis' },
      { href: '/candidate/applications', icon: '📌', label: 'Applications' },
      { href: '/candidate/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/candidate/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview', icon: '🎤', label: 'Mock Interview' },
    ],
  },
];

const RECRUITER_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/recruiter/dashboard', icon: '📊', label: 'Recruitment' },
      { href: '/recruiter/profile', icon: '🏢', label: 'Profile' },
      { href: '/recruiter/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
];

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker' || value === 'candidate') {
    return 'candidate';
  }

  if (value === 'recruiter') return 'recruiter';

  return value;
}

function getUserName(user: AuthShape['user']) {
  return (
    user?.fullName ??
    user?.full_name ??
    user?.name ??
    user?.email?.split('@')[0] ??
    'User'
  );
}

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RecruiterStats() {
  const [stats, setStats] = useState<{
    activeJobs: number;
    newApplicants: number;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jc_recruiter_stats');
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        activeJobs?: number;
        newApplicants?: number;
      };

      setStats({
        activeJobs: Number(parsed.activeJobs ?? 0),
        newApplicants: Number(parsed.newApplicants ?? 0),
      });
    } catch {
      setStats(null);
    }
  }, []);

  if (!stats) return null;

  return (
    <div style={statsBoxStyle}>
      <div>
        <strong style={{ color: '#F472B6' }}>{stats.activeJobs}</strong>
        <span>active</span>
      </div>
      <div>
        <strong style={{ color: '#38BDF8' }}>{stats.newApplicants}</strong>
        <span>applicants</span>
      </div>
    </div>
  );
}

export  function Sidebar() {
  const pathname = usePathname();
  const auth = useAuth() as unknown as AuthShape;
  const { unreadCount } = useAlerts();

  const [menuOpen, setMenuOpen] = useState(false);

  const user = auth.user;
  const role = normalizeRole(user?.role);
  const isRecruiter = role === 'recruiter';

  const groups = useMemo(
    () => (isRecruiter ? RECRUITER_NAV : CANDIDATE_NAV),
    [isRecruiter],
  );

  const userName = getUserName(user);
  const initial = userName.trim().charAt(0).toUpperCase() || 'U';

  const handleLogout = async () => {
    try {
      if (auth.logout) {
        await auth.logout();
      } else if (auth.signOut) {
        await auth.signOut();
      } else {
        localStorage.removeItem('jc_token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    } catch {
      localStorage.removeItem('jc_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  return (
    <aside style={sidebarStyle}>
      <div style={brandStyle}>
        <span style={logoMarkStyle}>⌬</span>
        <strong>HireX</strong>
      </div>

      <nav style={navStyle}>
        {groups.map((group) => (
          <section key={group.label} style={{ marginBottom: 24 }}>
            <p style={groupLabelStyle}>{group.label}</p>

            <div style={{ display: 'grid', gap: 8 }}>
              {group.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const isAlerts = item.href === '/alerts';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      ...navItemStyle,
                      ...(active ? activeNavItemStyle : {}),
                    }}
                  >
                    <span style={{ width: 24 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>

                    {isAlerts && unreadCount > 0 && (
                      <span style={badgeStyle}>{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {isRecruiter && group.label === 'Workspace' && <RecruiterStats />}
          </section>
        ))}
      </nav>

      <div style={bottomStyle}>
        {isRecruiter ? (
          <Link
            href="/recruiter/dashboard?tab=jobs&post=1"
            style={ctaStyle}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Post a Job
          </Link>
        ) : (
          <Link href="/resume-analysis" style={ctaStyle}>
            <span style={{ fontSize: 16 }}>🧠</span>
            Analyse Resume
          </Link>
        )}

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            style={accountButtonStyle}
          >
            <span style={avatarStyle}>{initial}</span>

            <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <strong
                style={{
                  display: 'block',
                  color: '#F8FAFC',
                  fontSize: 13,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </strong>
              <span style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11 }}>
                {isRecruiter ? 'Recruiter' : 'Candidate'}
              </span>
            </span>

            <span style={{ color: 'rgba(255,255,255,0.35)' }}>▾</span>
          </button>

          {menuOpen && (
            <div style={menuStyle}>
              <Link href="/settings" style={menuItemStyle}>
                ⚙ Settings
              </Link>

              <button
                type="button"
                onClick={() => void handleLogout()}
                style={{
                  ...menuItemStyle,
                  color: '#FCA5A5',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                ⏻ Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

const sidebarStyle: React.CSSProperties = {
  width: 280,
  height: '100vh',
  background: '#0B0F16',
  borderRight: '1px solid rgba(255,255,255,0.07)',
  display: 'flex',
  flexDirection: 'column',
  color: '#E2E8F0',
  fontFamily: "'Sora', sans-serif",
};

const brandStyle: React.CSSProperties = {
  height: 82,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 24px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  color: '#F8FAFC',
};

const logoMarkStyle: React.CSSProperties = {
  color: '#38BDF8',
  fontSize: 22,
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px 14px',
  overflowY: 'auto',
};

const groupLabelStyle: React.CSSProperties = {
  margin: '0 0 10px 10px',
  color: 'rgba(255,255,255,0.28)',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '13px 14px',
  borderRadius: 12,
  color: '#CBD5E1',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  border: '1px solid transparent',
  transition: 'all 0.16s ease',
};

const activeNavItemStyle: React.CSSProperties = {
  color: '#38BDF8',
  background: 'rgba(56,189,248,0.10)',
  border: '1px solid rgba(56,189,248,0.18)',
};

const badgeStyle: React.CSSProperties = {
  minWidth: 20,
  height: 20,
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(124,58,237,0.35)',
  border: '1px solid rgba(167,139,250,0.35)',
  color: '#C4B5FD',
  fontSize: 11,
  fontWeight: 900,
};

const statsBoxStyle: React.CSSProperties = {
  margin: '12px 10px 0',
  borderRadius: 12,
  border: '1px solid rgba(244,114,182,0.22)',
  background: 'rgba(244,114,182,0.07)',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  padding: '10px 12px',
  gap: 10,
  fontSize: 11,
};

const bottomStyle: React.CSSProperties = {
  padding: 14,
  borderTop: '1px solid rgba(255,255,255,0.06)',
  display: 'grid',
  gap: 14,
};

const ctaStyle: React.CSSProperties = {
  height: 48,
  borderRadius: 12,
  border: '1px solid rgba(244,114,182,0.24)',
  background: 'rgba(244,114,182,0.08)',
  color: '#F8FAFC',
  textDecoration: 'none',
  fontWeight: 900,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

const accountButtonStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.035)',
  borderRadius: 14,
  padding: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};

const avatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
  color: 'white',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
};

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 72,
  left: 0,
  right: 0,
  padding: 8,
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.1)',
  background: '#0F172A',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
  display: 'grid',
  gap: 6,
  zIndex: 20,
};

const menuItemStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#CBD5E1',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 800,
  padding: '10px 12px',
  borderRadius: 10,
  cursor: 'pointer',
  fontFamily: "'Sora', sans-serif",
};