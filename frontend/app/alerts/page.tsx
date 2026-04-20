// app/alerts/page.tsx

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAlerts } from '@/hooks/useRealTimeAlerts';

const ALERT_ICONS: Record<string, string> = {
  application: '📋',
  match:       '✨',
  interview:   '🎯',
  offer:       '🎉',
  update:      '🔔',
  system:      '⚙️',
  application_update: '📋',
  job_match: '✨',
  new_applicant: '🆕',
  interview_scheduled: '📅',
  interview_reminder: '⏰',
  interview_stage: '🧭',
  interview_round_result: '📝',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function AlertsPage() {
  const router = useRouter();
  const { alerts, unreadCount, loading, markRead, markAllRead } = useAlerts();
  const role = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as { role?: string };
      return parsed.role ?? null;
    } catch {
      return null;
    }
  }, []);

  const handleOpenAlert = async (alertId: string, href: string | null) => {
    await markRead(alertId);
    if (href) {
      router.push(href);
    }
  };

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fade  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Sora', sans-serif", color: '#E2E8F0' }}>

        {/* ── Header ── */}
        <div style={{
          background: '#0D1220',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '1.25rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                Alerts
              </h1>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(167,139,250,0.15)', color: '#A78BFA',
                  border: '1px solid rgba(167,139,250,0.3)',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Job matches, application updates, and system activity
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{
                fontSize: 12, color: '#A78BFA', background: 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: 'Sora, sans-serif', textDecoration: 'underline',
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 680, margin: '2rem auto', padding: '0 1.5rem' }}>

          {/* Skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{
                  height: 72, borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  animation: 'pulse 1.4s ease infinite',
                }} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && alerts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🔔</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px' }}>
                No alerts yet
              </p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Apply to jobs to start receiving application updates and matches.
              </p>
            </div>
          )}

          {/* Alert list */}
          {!loading && alerts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, animation: 'fade 0.3s ease' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => !alert.read && markRead(alert.id)}
                  style={{
                    padding: '1rem 1.25rem', borderRadius: 12,
                    border: `1px solid ${alert.read ? 'rgba(255,255,255,0.06)' : 'rgba(167,139,250,0.2)'}`,
                    background: alert.read ? 'rgba(255,255,255,0.02)' : 'rgba(124,58,237,0.06)',
                    cursor: alert.read ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                    {ALERT_ICONS[alert.type] ?? '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 12, lineHeight: 1.35,
                      color: 'rgba(255,255,255,0.45)',
                    }}>
                      {alert.title}
                    </p>
                    <p style={{
                      margin: '3px 0 0', fontSize: 13, lineHeight: 1.55,
                      fontWeight: alert.read ? 400 : 600,
                      color: alert.read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.88)',
                    }}>
                      {alert.message}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                      {timeAgo(alert.created_at)}
                    </p>
                    {getAlertHref(alert, role) && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenAlert(alert.id, getAlertHref(alert, role));
                        }}
                        style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid rgba(167,139,250,0.25)',
                          background: 'rgba(167,139,250,0.08)',
                          color: '#C4B5FD',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Open tracking
                      </button>
                    )}
                  </div>
                  {!alert.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#A78BFA', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function getAlertHref(
  alert: { type: string; metadata?: Record<string, unknown> },
  role: string | null,
): string | null {
  const interviewId = typeof alert.metadata?.interviewId === 'string' ? alert.metadata.interviewId : null;
  const roundNumber = typeof alert.metadata?.roundNumber === 'number' ? alert.metadata.roundNumber : null;

  if (alert.type.startsWith('interview') && interviewId) {
    if (roundNumber) {
      return `/interviews/room/jc-${interviewId}-r${roundNumber}`;
    }

    return role === 'recruiter' ? `/recruiter/interviews` : '/interviews';
  }

  if (alert.type === 'application_update') {
    return role === 'recruiter' ? '/recruiter/candidates' : '/applications';
  }

  if (alert.type === 'job_match') {
    return '/jobs';
  }

  return null;
}
