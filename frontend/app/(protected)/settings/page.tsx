'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#070B14',
  card: 'rgba(15,23,42,0.78)',
  card2: 'rgba(2,6,23,0.82)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(167,139,250,0.32)',
  text: '#F8FAFC',
  muted: 'rgba(226,232,240,0.68)',
  faint: 'rgba(226,232,240,0.42)',
  purple: '#A78BFA',
  sky: '#38BDF8',
  pink: '#F472B6',
  green: '#34D399',
  amber: '#FBBF24',
  red: '#F87171',
};

function normalizeRole(role?: string | null) {
  const value = String(role ?? '').toLowerCase();

  if (value === 'jobseeker' || value === 'job_seeker') return 'candidate';
  if (value === 'recruiter') return 'recruiter';
  if (value === 'admin') return 'admin';
  if (value === 'super_admin') return 'super_admin';

  return value || 'user';
}

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: `1px solid ${C.border}`,
        background:
          'linear-gradient(145deg, rgba(15,23,42,0.82), rgba(2,6,23,0.86))',
        borderRadius: 22,
        padding: '1.25rem',
        boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            color: C.text,
            fontSize: 19,
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '0.45rem 0 0',
            color: C.muted,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 14,
        padding: '11px 0',
        borderTop: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          color: C.faint,
          fontSize: 12,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: value ? C.text : C.faint,
          fontSize: 14,
          wordBreak: 'break-word',
        }}
      >
        {value || 'Not available'}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const [logoutOpen, setLogoutOpen] = useState(false);

  const initials = useMemo(() => {
    const source = user?.full_name || user?.email || 'U';
    return source.charAt(0).toUpperCase();
  }, [user?.email, user?.full_name]);

  const role = normalizeRole(user?.role);

  const handleLogout = async () => {
    setLogoutOpen(false);
    await logout();
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.text,
          padding: '2rem',
        }}
      >
        Loading settings...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem',
        color: C.text,
        background:
          'radial-gradient(circle at top left, rgba(56,189,248,0.10), transparent 32%), radial-gradient(circle at top right, rgba(244,114,182,0.12), transparent 28%), #070B14',
      }}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header
          style={{
            border: `1px solid ${C.borderStrong}`,
            background:
              'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(2,6,23,0.92))',
            borderRadius: 26,
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 18,
            alignItems: 'center',
            boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 22,
              background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 28,
              fontWeight: 900,
              border: `1px solid ${C.borderStrong}`,
            }}
          >
            {initials}
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: C.sky,
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Account Settings
            </p>

            <h1
              style={{
                margin: '0.45rem 0 0',
                fontSize: 32,
                lineHeight: 1.08,
                letterSpacing: '-0.055em',
              }}
            >
              Manage your JobCrawler account
            </h1>

            <p
              style={{
                margin: '0.7rem 0 0',
                color: C.muted,
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Settings is now a dedicated sidebar section. Profile editing and
              product workflows stay in their own pages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            style={{
              border: '1px solid rgba(248,113,113,0.35)',
              borderRadius: 14,
              padding: '12px 16px',
              color: C.red,
              fontWeight: 900,
              cursor: 'pointer',
              background: 'rgba(248,113,113,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            Sign out
          </button>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <SettingCard
            title="Account"
            description="Your basic signed-in account information."
          >
            <InfoRow label="Name" value={user?.full_name} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Role" value={role} />
            <InfoRow label="User ID" value={user?.id} />
          </SettingCard>

          <SettingCard
            title="Navigation"
            description="Quickly move to the right workspace."
          >
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                style={primaryButtonStyle}
              >
                Open Overview
              </button>

              {role === 'recruiter' ? (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/recruiter/dashboard')}
                    style={secondaryButtonStyle}
                  >
                    Open Recruitment Center
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/recruiter/interviews')}
                    style={secondaryButtonStyle}
                  >
                    Open Interviews
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/jobs')}
                    style={secondaryButtonStyle}
                  >
                    Open Jobs
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/interviews')}
                    style={secondaryButtonStyle}
                  >
                    Open Interviews
                  </button>
                </>
              )}
            </div>
          </SettingCard>

          <SettingCard
            title="Security"
            description="Session and sign-out controls."
          >
            <div
              style={{
                border: `1px solid rgba(248,113,113,0.24)`,
                background: 'rgba(248,113,113,0.08)',
                borderRadius: 16,
                padding: '1rem',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: C.text,
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                Sign out from this device
              </h3>

              <p
                style={{
                  margin: '0.5rem 0 1rem',
                  color: C.muted,
                  fontSize: 13,
                  lineHeight: 1.65,
                }}
              >
                You will need to log in again to access dashboards, recruitment,
                interviews, and alerts.
              </p>

              <button
                type="button"
                onClick={() => setLogoutOpen(true)}
                style={{
                  border: '1px solid rgba(248,113,113,0.35)',
                  borderRadius: 14,
                  padding: '11px 14px',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #EF4444, #F97316)',
                }}
              >
                Sign out
              </button>
            </div>
          </SettingCard>

          <SettingCard
            title="Preferences"
            description="More settings can be connected here later."
          >
            <div
              style={{
                display: 'grid',
                gap: 10,
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              <div style={preferenceRowStyle}>
                <span>Theme</span>
                <strong style={{ color: C.text }}>Dark</strong>
              </div>

              <div style={preferenceRowStyle}>
                <span>Notifications</span>
                <strong style={{ color: C.text }}>Enabled</strong>
              </div>

              <div style={preferenceRowStyle}>
                <span>Account mode</span>
                <strong style={{ color: C.text }}>Production</strong>
              </div>
            </div>
          </SettingCard>
        </div>
      </div>

      {logoutOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-logout-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(2,6,23,.76)',
            backdropFilter: 'blur(12px)',
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(390px, 100%)',
              borderRadius: 24,
              border: '1px solid rgba(248,113,113,.28)',
              background:
                'radial-gradient(circle at top, rgba(248,113,113,.12), transparent 36%), linear-gradient(145deg, rgba(15,23,42,.98), rgba(2,6,23,.98))',
              boxShadow: '0 28px 90px rgba(0,0,0,.55)',
              padding: 22,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 18,
                margin: '0 auto 14px',
                display: 'grid',
                placeItems: 'center',
                color: C.red,
                background: 'rgba(248,113,113,.10)',
                border: '1px solid rgba(248,113,113,.24)',
                fontSize: 24,
              }}
            >
              ⏻
            </div>

            <h2
              id="settings-logout-title"
              style={{
                margin: 0,
                color: C.text,
                fontSize: 22,
                letterSpacing: '-0.04em',
              }}
            >
              Sign out?
            </h2>

            <p
              style={{
                margin: '10px auto 0',
                color: C.muted,
                fontSize: 13,
                lineHeight: 1.65,
                maxWidth: 300,
              }}
            >
              You will be signed out from this device. Continue?
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                style={secondaryButtonStyle}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleLogout()}
                style={{
                  border: '1px solid rgba(248,113,113,.35)',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #EF4444, #F97316)',
                  borderRadius: 14,
                  padding: '11px 13px',
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 14,
  padding: '12px 16px',
  color: '#020617',
  fontWeight: 900,
  cursor: 'pointer',
  background: `linear-gradient(135deg, ${C.sky}, ${C.purple}, ${C.pink})`,
  boxShadow: '0 16px 38px rgba(56,189,248,0.18)',
};

const secondaryButtonStyle: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  padding: '11px 16px',
  color: C.text,
  fontWeight: 800,
  cursor: 'pointer',
  background: 'rgba(15,23,42,0.72)',
};

const preferenceRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  borderTop: `1px solid ${C.border}`,
  padding: '12px 0',
};