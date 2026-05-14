'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAlerts } from '@/hooks/useRealTimeAlerts';

const CANDIDATE_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
      { href: '/jobs', icon: '💼', label: 'Jobs' },
      { href: '/saved-jobs', icon: '🔖', label: 'Saved Jobs' },
      { href: '/resumes', icon: '📄', label: 'Resume' },
      { href: '/resume-analysis', icon: '🧠', label: 'Resume Analysis' },
      { href: '/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
  {
    label: 'Discover',
    items: [
      { href: '/recommendations', icon: '🎯', label: 'Recommendations' },
      { href: '/mock-interview', icon: '🎤', label: 'Mock Interview' },
    ],
  },
] as const;

const RECRUITER_NAV = [
  {
    label: 'Workspace',
    items: [
      { href: '/dashboard', icon: '⊞', label: 'Overview' },
      { href: '/recruiter/dashboard', icon: '📊', label: 'Recruitment' },
      { href: '/recruiter/interviews', icon: '🎥', label: 'Interviews' },
      { href: '/alerts', icon: '🔔', label: 'Alerts' },
    ],
  },
] as const;

function RecruiterStats() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('jc_recruiter_stats');
    if (!raw) return null;

    const stats = JSON.parse(raw) as {
      activeJobs: number;
      newApplicants: number;
    };

    if (!stats.activeJobs && !stats.newApplicants) return null;

    return (
      <div
        style={{
          margin: '2px 10px 6px',
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(244,114,182,0.07)',
          border: '1px solid rgba(244,114,182,0.18)',
          display: 'flex',
          gap: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#F472B6',
              lineHeight: 1,
            }}
          >
            {stats.activeJobs}
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            active
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#38BDF8',
              lineHeight: 1,
            }}
          >
            {stats.newApplicants}
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            applicants
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

function LogoutConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="sb-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-logout-title"
    >
      <div className="sb-modal-card">
        <div className="sb-modal-icon">⏻</div>

        <h2 id="sb-logout-title" className="sb-modal-title">
          Sign out?
        </h2>

        <p className="sb-modal-text">
          You will be signed out from this device. You can log in again anytime.
        </p>

        <div className="sb-modal-actions">
          <button type="button" className="sb-modal-cancel" onClick={onCancel}>
            Cancel
          </button>

          <button type="button" className="sb-modal-confirm" onClick={onConfirm}>
            Yes, sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { unreadCount = 0 } = useAlerts();

  const isCandidate = user?.role === 'candidate';
  const isRecruiter = user?.role === 'recruiter';

  const navGroups = isCandidate ? CANDIDATE_NAV : RECRUITER_NAV;

  const initial =
    user?.full_name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    'U';

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!menuRef.current) return;

      if (!menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setLogoutOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const handleLogout = async () => {
    setLogoutOpen(false);
    setAccountMenuOpen(false);
    await logout();
  };

  return (
    <>
      <style>{`
        @keyframes sbMenuIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes sbModalIn { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .sb-root {
          width: 240px;
          height: 100vh;
          position: sticky;
          top: 0;
          background: #0D1117;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          font-family: 'Sora', sans-serif;
        }

        .sb-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 1.25rem 1.25rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }

        .sb-logo-mark {
          font-size: 18px;
          font-weight: 800;
          color: #38BDF8;
        }

        .sb-logo-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
        }

        .sb-nav {
          flex: 1;
          padding: .5rem .75rem 0;
          overflow-y: auto;
          min-height: 0;
        }

        .sb-nav::-webkit-scrollbar {
          width: 3px;
        }

        .sb-nav::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,.08);
          border-radius: 2px;
        }

        .sb-grp {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: rgba(255,255,255,.2);
          padding: 0 .5rem;
          margin: .6rem 0 .3rem;
        }

        .sb-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 2px;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          color: rgba(255,255,255,.45);
          border: 1px solid transparent;
          transition: all .15s;
          position: relative;
        }

        .sb-link:hover {
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.8);
        }

        .sb-link.ac {
          background: rgba(56,189,248,.08);
          color: #38BDF8;
          border-color: rgba(56,189,248,.15);
        }

        .sb-link.ar {
          background: rgba(244,114,182,.08);
          color: #F472B6;
          border-color: rgba(244,114,182,.15);
        }

        .sb-icon {
          font-size: 15px;
          width: 20px;
          text-align: center;
          flex-shrink: 0;
        }

        .sb-badge {
          margin-left: auto;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          background: rgba(167,139,250,.2);
          color: #A78BFA;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(167,139,250,.3);
        }

        .sb-rec-cta {
          margin: .5rem .75rem .25rem;
          padding: 10px;
          border-radius: 10px;
          text-decoration: none;
          background: rgba(244,114,182,.08);
          border: 1px solid rgba(244,114,182,.2);
          color: #F472B6;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all .15s;
          flex-shrink: 0;
        }

        .sb-rec-cta:hover {
          background: rgba(244,114,182,.14);
        }

        .sb-foot {
          position: relative;
          padding: .75rem;
          border-top: 1px solid rgba(255,255,255,.07);
          flex-shrink: 0;
        }

        .sb-ucard {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          transition: all .15s;
          width: 100%;
          text-align: left;
          font-family: 'Sora', sans-serif;
        }

        .sb-ucard:hover,
        .sb-ucard.open {
          background: rgba(255,255,255,.06);
          border-color: rgba(255,255,255,.13);
        }

        .sb-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg,#6366F1,#8B5CF6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }

        .sb-uinfo {
          flex: 1;
          min-width: 0;
        }

        .sb-uname {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,.8);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-urole {
          font-size: 10px;
          color: rgba(255,255,255,.3);
          text-transform: capitalize;
          margin-top: 1px;
        }

        .sb-uhint {
          font-size: 9px;
          color: rgba(255,255,255,.18);
          margin-top: 2px;
        }

        .sb-chevron {
          color: rgba(255,255,255,.24);
          font-size: 12px;
          transition: transform .15s;
          flex-shrink: 0;
        }

        .sb-chevron.open {
          transform: rotate(180deg);
        }

        .sb-account-menu {
          position: absolute;
          left: .75rem;
          right: .75rem;
          bottom: calc(100% - .35rem);
          z-index: 20;
          padding: 8px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.10);
          background:
            radial-gradient(circle at top left, rgba(56,189,248,.10), transparent 35%),
            linear-gradient(145deg, rgba(15,23,42,.98), rgba(2,6,23,.98));
          box-shadow: 0 18px 60px rgba(0,0,0,.45);
          animation: sbMenuIn .16s ease;
        }

        .sb-menu-user {
          padding: 9px 10px 10px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          margin-bottom: 6px;
        }

        .sb-menu-name {
          color: rgba(255,255,255,.86);
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-menu-email {
          color: rgba(255,255,255,.36);
          font-size: 10px;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sb-menu-link,
        .sb-menu-btn {
          width: 100%;
          border: none;
          background: transparent;
          color: rgba(255,255,255,.66);
          text-decoration: none;
          padding: 10px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Sora', sans-serif;
          cursor: pointer;
          text-align: left;
          transition: all .15s;
        }

        .sb-menu-link:hover {
          color: #38BDF8;
          background: rgba(56,189,248,.08);
        }

        .sb-menu-btn:hover {
          color: #F87171;
          background: rgba(248,113,113,.08);
        }

        .sb-menu-danger {
          color: #F87171;
        }

        .sb-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: rgba(2,6,23,.76);
          backdrop-filter: blur(12px);
          padding: 20px;
        }

        .sb-modal-card {
          width: min(380px, 100%);
          border-radius: 24px;
          border: 1px solid rgba(248,113,113,.28);
          background:
            radial-gradient(circle at top, rgba(248,113,113,.12), transparent 36%),
            linear-gradient(145deg, rgba(15,23,42,.98), rgba(2,6,23,.98));
          box-shadow: 0 28px 90px rgba(0,0,0,.55);
          padding: 22px;
          text-align: center;
          animation: sbModalIn .18s ease;
        }

        .sb-modal-icon {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          margin: 0 auto 14px;
          display: grid;
          place-items: center;
          color: #F87171;
          background: rgba(248,113,113,.10);
          border: 1px solid rgba(248,113,113,.24);
          font-size: 24px;
        }

        .sb-modal-title {
          margin: 0;
          color: #F8FAFC;
          font-size: 22px;
          letter-spacing: -.04em;
        }

        .sb-modal-text {
          margin: 10px auto 0;
          color: rgba(226,232,240,.68);
          font-size: 13px;
          line-height: 1.65;
          max-width: 300px;
        }

        .sb-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
        }

        .sb-modal-cancel,
        .sb-modal-confirm {
          border-radius: 14px;
          padding: 11px 13px;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .sb-modal-cancel {
          border: 1px solid rgba(255,255,255,.10);
          color: rgba(255,255,255,.78);
          background: rgba(255,255,255,.04);
        }

        .sb-modal-confirm {
          border: 1px solid rgba(248,113,113,.35);
          color: #fff;
          background: linear-gradient(135deg, #EF4444, #F97316);
        }
      `}</style>

      <aside className="sb-root" aria-label="Sidebar navigation">
        <div className="sb-logo">
          <span className="sb-logo-mark">⬡</span>
          <span className="sb-logo-name">JobCrawler</span>
        </div>

        <nav className="sb-nav">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              <div className="sb-grp">{group.label}</div>

              {group.items.map((item) => {
                const exactDashboard =
                  item.href === '/dashboard' && pathname === '/dashboard';

                const exactRecruitment =
                  item.href === '/recruiter/dashboard' &&
                  pathname === '/recruiter/dashboard';

                const nestedActive =
                  item.href !== '/dashboard' &&
                  item.href !== '/recruiter/dashboard' &&
                  pathname.startsWith(item.href);

                const active =
                  exactDashboard || exactRecruitment || nestedActive;

                const cls = active ? (isRecruiter ? 'ar' : 'ac') : '';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sb-link ${cls}`}
                  >
                    <span className="sb-icon">{item.icon}</span>
                    {item.label}

                    {item.href === '/alerts' && unreadCount > 0 && (
                      <span className="sb-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}

              {isRecruiter && groupIndex === 0 && <RecruiterStats />}
            </div>
          ))}
        </nav>

        {isRecruiter && (
          <Link href="/recruiter/dashboard" className="sb-rec-cta">
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            Recruitment Center
          </Link>
        )}

        {user && (
          <div className="sb-foot" ref={menuRef}>
            {accountMenuOpen && (
              <div className="sb-account-menu">
                <div className="sb-menu-user">
                  <div className="sb-menu-name">
                    {user.full_name ?? 'JobCrawler User'}
                  </div>
                  <div className="sb-menu-email">{user.email}</div>
                </div>

                <Link
                  href="/settings"
                  className="sb-menu-link"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  <span>⚙️</span>
                  Settings
                </Link>

                <button
                  type="button"
                  className="sb-menu-btn sb-menu-danger"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                >
                  <span>⏻</span>
                  Sign out
                </button>
              </div>
            )}

            <button
              type="button"
              className={`sb-ucard ${accountMenuOpen ? 'open' : ''}`}
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              title="Account menu"
            >
              <div className="sb-avatar" aria-hidden="true">
                {initial}
              </div>

              <div className="sb-uinfo">
                <div className="sb-uname">{user.full_name ?? user.email}</div>
                <div className="sb-urole">{user.role}</div>
                <div className="sb-uhint">Account menu</div>
              </div>

              <span className={`sb-chevron ${accountMenuOpen ? 'open' : ''}`}>
                ▾
              </span>
            </button>
          </div>
        )}
      </aside>

      <LogoutConfirmModal
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </>
  );
}

export default Sidebar;