'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// Explicit interface prevents TypeScript from inferring the narrowest possible
// type from array literals — badge would be dropped without this contract.
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  href:   string;
  label:  string;
  icon:   string;
  badge?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation config — separated by role
// ─────────────────────────────────────────────────────────────────────────────

const CANDIDATE_NAV: NavItem[] = [
  { href: '/dashboard',       label: 'Dashboard',     icon: '◈' },
  { href: '/jobs',            label: 'Job Feed',       icon: '◎' },
  { href: '/resumes',         label: 'My Resumes',     icon: '◆' },
  { href: '/mock-interview',  label: 'Mock Interview', icon: '◉', badge: 'AI' },
  { href: '/recommendations', label: 'Recommended',    icon: '✦', badge: 'AI' },
  { href: '/profile',         label: 'Profile',        icon: '◷' },
  { href: '/settings',        label: 'Settings',       icon: '⚙' },
];

const RECRUITER_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',    icon: '◈' },
  { href: '/jobs',      label: 'Job Postings', icon: '◎' },
  { href: '/profile',   label: 'Company',      icon: '◆' },
  { href: '/settings',  label: 'Settings',     icon: '⚙' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Role-based design tokens
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { bg: string; accent: string }> = {
  candidate: { bg: '#0D1424', accent: '#38BDF8' },
  recruiter: { bg: '#0F1526', accent: '#F472B6' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar component
// ─────────────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname              = usePathname();
  const router                = useRouter();
  const { user, logout }      = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role   = user?.role ?? 'candidate';
  const nav    = role === 'recruiter' ? RECRUITER_NAV : CANDIDATE_NAV;
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.candidate;
  const { bg, accent } = config;

  // Derive initials safely
  const initials = (user?.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  // Active route detection
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      style={{
        width:          collapsed ? '60px' : '220px',
        background:      bg,
        borderRight:    '1px solid rgba(255,255,255,0.06)',
        height:         '100vh',
        position:       'fixed',
        top:             0,
        left:            0,
        display:        'flex',
        flexDirection:  'column',
        padding:        collapsed ? '1rem 0.5rem' : '1rem',
        transition:     'width 0.2s ease',
        zIndex:          50,
        overflowX:      'hidden',
        overflowY:      'auto',
      }}
    >
      {/* ── Logo + collapse toggle ────────────────────────────────────── */}

      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          marginBottom:   '1.5rem',
          paddingBottom:  '1rem',
          borderBottom:   '1px solid rgba(255,255,255,0.06)',
          gap:            '8px',
        }}
      >
        {!collapsed && (
          <span
            style={{
              fontSize:      '12px',
              fontWeight:     700,
              color:          accent,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              whiteSpace:    'nowrap',
            }}
          >
            ⬡ JobCrawler
          </span>
        )}

        <button
          onClick={() => setCollapsed(prev => !prev)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'rgba(255,255,255,0.3)',
            fontSize:    '12px',
            padding:     '4px',
            lineHeight:   1,
            flexShrink:   0,
            borderRadius:'4px',
            transition:  'color 0.15s',
          }}
          onMouseEnter={e =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.7)')
          }
          onMouseLeave={e =>
            ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)')
          }
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* ── Navigation items ─────────────────────────────────────────── */}

      <nav
        style={{
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
          gap:           '2px',
        }}
      >
        {nav.map((item: NavItem) => {
          const active = isActive(item.href);

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              title={collapsed ? item.label : undefined}
              style={{
                display:        'flex',
                alignItems:     'center',
                gap:            '10px',
                padding:        collapsed ? '10px' : '9px 12px',
                borderRadius:   '8px',
                fontSize:       '13px',
                fontWeight:      active ? 600 : 400,
                color:           active ? accent : 'rgba(255,255,255,0.4)',
                background:      active ? `${accent}15` : 'transparent',
                border:         'none',
                cursor:         'pointer',
                transition:     'all 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
                position:       'relative',
                whiteSpace:     'nowrap',
                width:          '100%',
                textAlign:      'left',
              }}
              onMouseEnter={e => {
                if (!active) {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = 'rgba(255,255,255,0.04)';
                  btn.style.color      = 'rgba(255,255,255,0.7)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.style.background = 'transparent';
                  btn.style.color      = 'rgba(255,255,255,0.4)';
                }
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: '15px', flexShrink: 0 }}>
                {item.icon}
              </span>

              {/* Label + badge — hidden when collapsed */}
              {!collapsed && (
                <>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>

                  {/* ✅ item.badge is now correctly typed via NavItem interface */}
                  {item.badge && (
                    <span
                      style={{
                        fontSize:      '9px',
                        padding:       '2px 6px',
                        borderRadius:  '4px',
                        background:    `${accent}20`,
                        color:          accent,
                        fontWeight:     700,
                        letterSpacing: '0.05em',
                        flexShrink:     0,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Active indicator dot when collapsed */}
              {collapsed && active && (
                <span
                  style={{
                    position:     'absolute',
                    right:        '6px',
                    top:          '50%',
                    transform:    'translateY(-50%)',
                    width:        '4px',
                    height:       '4px',
                    borderRadius: '50%',
                    background:    accent,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────────────────── */}

      <div
        style={{
          borderTop:   '1px solid rgba(255,255,255,0.06)',
          paddingTop:  '0.75rem',
          marginTop:   '0.5rem',
          display:     'flex',
          alignItems:  'center',
          gap:         '10px',
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width:          '32px',
            height:         '32px',
            borderRadius:   '8px',
            background:     `linear-gradient(135deg, ${accent}99, ${accent})`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '11px',
            fontWeight:      700,
            color:          '#fff',
            flexShrink:      0,
          }}
        >
          {initials}
        </div>

        {/* Name + role — hidden when collapsed */}
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize:     '12px',
                  fontWeight:    600,
                  color:        '#F1F5F9',
                  margin:        0,
                  overflow:     'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace:   'nowrap',
                }}
              >
                {user?.full_name ?? 'User'}
              </p>
              <p
                style={{
                  fontSize:      '10px',
                  color:         'rgba(255,255,255,0.3)',
                  margin:        0,
                  textTransform: 'capitalize',
                }}
              >
                {role}
              </p>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Sign out"
              style={{
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                color:      'rgba(255,255,255,0.25)',
                fontSize:   '14px',
                padding:    '4px',
                flexShrink:  0,
                borderRadius:'4px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e =>
                ((e.currentTarget as HTMLButtonElement).style.color = '#F87171')
              }
              onMouseLeave={e =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.25)')
              }
            >
              ⎋
            </button>
          </>
        )}
      </div>
    </aside>
  );
}