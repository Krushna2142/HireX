/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';
import { UserRole, roleRedirectPath } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Role configuration
// ─────────────────────────────────────────────────────────────────────────────

const ROLES: Record<UserRole, {
  label:       string;
  icon:        string;
  description: string;
  accent:      string;
  bg:          string;
  border:      string;
  gradient:    string;
}> = {
  candidate: {
    label:       'Job Seeker',
    icon:        '🎯',
    description: 'Upload resume, get AI-matched to jobs, track applications',
    accent:      '#38BDF8',
    bg:          'rgba(56,189,248,0.08)',
    border:      'rgba(56,189,248,0.35)',
    gradient:    'linear-gradient(135deg, #0369A1, #0EA5E9)',
  },
  recruiter: {
    label:       'Recruiter',
    icon:        '🏢',
    description: 'Post roles, search candidates, manage hiring pipeline',
    accent:      '#F472B6',
    bg:          'rgba(244,114,182,0.08)',
    border:      'rgba(244,114,182,0.35)',
    gradient:    'linear-gradient(135deg, #9D174D, #EC4899)',
  },
};

const STRENGTH_META = [
  { color: '#EF4444', label: 'Very weak',   bg: 'rgba(239,68,68,0.2)'   },
  { color: '#F97316', label: 'Weak',         bg: 'rgba(249,115,22,0.2)'  },
  { color: '#EAB308', label: 'Fair',         bg: 'rgba(234,179,8,0.2)'   },
  { color: '#22C55E', label: 'Strong',       bg: 'rgba(34,197,94,0.2)'   },
  { color: '#16A34A', label: 'Very strong',  bg: 'rgba(22,163,74,0.2)'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CredentialsModal({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const router               = useRouter();
  const { login, register, user } = useAuth();
  const overlayRef           = useRef<HTMLDivElement>(null);

  const [panel,    setPanel]    = useState<'login' | 'register'>('login');
  const [role,     setRole]     = useState<UserRole>('candidate');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const strength     = zxcvbn(password).score;
  const strengthMeta = STRENGTH_META[strength];
  const activeRole   = ROLES[role];

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      onClose();
      router.push(roleRedirectPath(user.role));
    }
  }, [user, onClose, router]);

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Reset form state when switching panels
  function switchPanel(target: 'login' | 'register') {
    setPassword('');
    setPanel(target);
  }

  if (!open) return null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user: u } = await login(email, password);
      toast.success(`Welcome back, ${u.full_name.split(' ')[0]} 🚀`);
      router.push(roleRedirectPath(u.role));
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (strength < 2) {
      toast.error('Password is too weak — aim for "Fair" or better');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password, role);
      toast.success(`${ROLES[role].label} account created 🎉`);
      router.push(roleRedirectPath(role));
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Shared input style ──────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width:        '100%',
    padding:      '11px 14px',
    background:   'rgba(255,255,255,0.07)',
    border:       '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color:        '#F1F5F9',
    fontSize:     '13px',
    outline:      'none',
    transition:   'border-color 0.15s, box-shadow 0.15s',
    boxSizing:    'border-box',
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .cred-input:focus {
          border-color: rgba(139,92,246,0.6) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important;
        }
        .cred-input::placeholder { color: rgba(255,255,255,0.25); }
        .cred-overlay {
          animation: fadeIn 0.2s ease;
        }
        .cred-modal {
          animation: scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1);
        }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .cred-btn-google:hover { background: rgba(255,255,255,0.95) !important; }
        .cred-btn-github:hover { background: rgba(255,255,255,0.1) !important; }
        .cred-link { color: #A78BFA; cursor: pointer; text-decoration: none; }
        .cred-link:hover { text-decoration: underline; }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        ref={overlayRef}
        className="cred-overlay"
        onClick={handleOverlayClick}
        style={{
          position:       'fixed',
          inset:           0,
          zIndex:          100,
          background:     'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        '1rem',
        }}
      >
        {/* ── Modal shell ────────────────────────────────────────────────── */}
        <div
          className="cred-modal"
          style={{
            width:        '100%',
            maxWidth:     '880px',
            borderRadius: '24px',
            overflow:     'hidden',
            boxShadow:    '0 32px 80px rgba(0,0,0,0.6)',
            border:       '1px solid rgba(255,255,255,0.08)',
            // Flex row — left form panel + right decorative panel
            display:      'flex',
            minHeight:    '560px',
            background:   '#0B0F1A',
          }}
        >
          {/* ── LEFT: Form panel ─────────────────────────────────────────── */}
          <div style={{
            flex:           1,
            minWidth:       0,
            padding:        '2.5rem',
            display:        'flex',
            flexDirection:  'column',
            justifyContent: 'center',
            overflowY:      'auto',
          }}>

            {/* ── LOGIN FORM ─────────────────────────────────────────────── */}
            {panel === 'login' && (
              <form onSubmit={handleLogin} style={{ maxWidth: '360px', margin: '0 auto', width: '100%' }}>

                {/* Header */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 6px' }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    Sign in to your account
                  </p>
                </div>

                {/* Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <input
                    className="cred-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <input
                    className="cred-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width:        '100%',
                    padding:      '12px',
                    background:   'linear-gradient(135deg, #6D28D9, #7C3AED)',
                    border:       'none',
                    borderRadius: '10px',
                    color:        '#fff',
                    fontSize:     '14px',
                    fontWeight:    600,
                    cursor:       loading ? 'not-allowed' : 'pointer',
                    opacity:      loading ? 0.6 : 1,
                    transition:   'opacity 0.15s, transform 0.15s',
                    marginBottom: '12px',
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget.style.transform = 'translateY(-1px)'); }}
                  onMouseLeave={e => { (e.currentTarget.style.transform = 'translateY(0)'); }}
                >
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>

                {/* OAuth */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="cred-btn-google"
                    style={{
                      flex:           1,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            '8px',
                      padding:        '10px',
                      background:     '#fff',
                      border:         'none',
                      borderRadius:   '10px',
                      color:          '#374151',
                      fontSize:       '13px',
                      fontWeight:      500,
                      cursor:         'pointer',
                      transition:     'background 0.15s',
                    }}
                  >
                    <FcGoogle size={17} /> Google
                  </button>
                  <button
                    type="button"
                    className="cred-btn-github"
                    style={{
                      flex:           1,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            '8px',
                      padding:        '10px',
                      background:     'rgba(255,255,255,0.06)',
                      border:         '1px solid rgba(255,255,255,0.12)',
                      borderRadius:   '10px',
                      color:          '#F1F5F9',
                      fontSize:       '13px',
                      fontWeight:      500,
                      cursor:         'pointer',
                      transition:     'background 0.15s',
                    }}
                  >
                    <FaGithub size={16} /> GitHub
                  </button>
                </div>

                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: 0 }}>
                  No account?{' '}
                  <span className="cred-link" onClick={() => switchPanel('register')}>
                    Create one
                  </span>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ──────────────────────────────────────────── */}
            {panel === 'register' && (
              <form onSubmit={handleSignup} style={{ maxWidth: '420px', margin: '0 auto', width: '100%' }}>

                {/* Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 6px' }}>
                    Create account
                  </h2>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                    Choose your role to get started
                  </p>
                </div>

                {/* ── Role selector ─────────────────────────────────────── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
                  {(Object.entries(ROLES) as [UserRole, typeof ROLES[UserRole]][]).map(([key, cfg]) => {
                    const selected = role === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRole(key)}
                        style={{
                          padding:      '14px',
                          borderRadius: '14px',
                          border:       selected
                            ? `2px solid ${cfg.border}`
                            : '2px solid rgba(255,255,255,0.08)',
                          background:   selected ? cfg.bg : 'rgba(255,255,255,0.03)',
                          textAlign:    'left',
                          cursor:       'pointer',
                          transition:   'all 0.2s ease',
                          position:     'relative',
                          boxShadow:    selected ? `0 0 20px ${cfg.accent}18` : 'none',
                        }}
                      >
                        {/* Checkmark */}
                        {selected && (
                          <div style={{
                            position:       'absolute',
                            top:            '10px',
                            right:          '10px',
                            width:          '20px',
                            height:         '20px',
                            borderRadius:   '50%',
                            background:      cfg.accent,
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: 'center',
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        <div style={{ fontSize: '22px', marginBottom: '8px' }}>{cfg.icon}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9', marginBottom: '4px' }}>
                          {cfg.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                          {cfg.description}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Form fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <input
                    className="cred-input"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <input
                    className="cred-input"
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <input
                  className="cred-input"
                  type="password"
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '8px' }}
                  required
                />

                {/* Password strength meter */}
                {password.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[0, 1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          style={{
                            flex:         1,
                            height:       '3px',
                            borderRadius: '99px',
                            background:   i <= strength
                              ? strengthMeta.color
                              : 'rgba(255,255,255,0.08)',
                            transition:   'background 0.3s',
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                      {strengthMeta.label}
                    </p>
                  </div>
                )}

                {/* Role confirmation banner */}
                <div
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '10px',
                    padding:      '10px 12px',
                    borderRadius: '10px',
                    background:    activeRole.bg,
                    border:       `1px solid ${activeRole.border}`,
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{activeRole.icon}</span>
                  <p style={{ fontSize: '11px', color: activeRole.accent, margin: 0, lineHeight: 1.4 }}>
                    Registering as <strong>{activeRole.label}</strong> —{' '}
                    {role === 'recruiter'
                      ? 'access recruiter dashboard & candidate search'
                      : 'access job matches, resume analysis & application tracking'}
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width:        '100%',
                    padding:      '12px',
                    background:    activeRole.gradient,
                    border:       'none',
                    borderRadius: '10px',
                    color:        '#fff',
                    fontSize:     '14px',
                    fontWeight:    600,
                    cursor:       loading ? 'not-allowed' : 'pointer',
                    opacity:      loading ? 0.6 : 1,
                    transition:   'opacity 0.15s',
                    marginBottom: '12px',
                  }}
                >
                  {loading ? 'Creating account…' : `Create ${activeRole.label} Account →`}
                </button>

                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', margin: 0 }}>
                  Already have an account?{' '}
                  <span className="cred-link" onClick={() => switchPanel('login')}>
                    Sign in
                  </span>
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: Decorative panel ───────────────────────────────────── */}
          {/* Fixed-width, always visible — content changes based on active panel */}
          <div
            style={{
              width:          '340px',
              flexShrink:      0,
              background:     panel === 'login'
                ? 'linear-gradient(145deg, #312E81 0%, #5B21B6 50%, #7C3AED 100%)'
                : 'linear-gradient(145deg, #1E1B4B 0%, #3730A3 50%, #4F46E5 100%)',
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              textAlign:      'center',
              padding:        '2.5rem',
              transition:     'background 0.5s ease',
              position:       'relative',
              overflow:       'hidden',
            }}
          >
            {/* Background glow */}
            <div style={{
              position:   'absolute',
              top:        '-60px',
              right:      '-60px',
              width:      '200px',
              height:     '200px',
              borderRadius:'50%',
              background: 'rgba(255,255,255,0.05)',
              pointerEvents:'none',
            }} />
            <div style={{
              position:   'absolute',
              bottom:     '-40px',
              left:       '-40px',
              width:      '160px',
              height:     '160px',
              borderRadius:'50%',
              background: 'rgba(255,255,255,0.04)',
              pointerEvents:'none',
            }} />

            {/* Content */}
            {panel === 'login' ? (
              <>
                <div style={{ fontSize: '52px', marginBottom: '20px', lineHeight: 1 }}>✨</div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
                  New here?
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 28px' }}>
                  Join as a job seeker or recruiter and unlock AI-powered career tools
                </p>
                <button
                  onClick={() => switchPanel('register')}
                  style={{
                    padding:      '11px 28px',
                    background:   'transparent',
                    border:       '1.5px solid rgba(255,255,255,0.4)',
                    borderRadius: '10px',
                    color:        '#fff',
                    fontSize:     '13px',
                    fontWeight:    600,
                    cursor:       'pointer',
                    transition:   'all 0.2s',
                    backdropFilter:'blur(4px)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.12)');
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)');
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget.style.background = 'transparent');
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)');
                  }}
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '52px', marginBottom: '20px', lineHeight: 1 }}>👋</div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
                  Welcome back!
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '0 0 28px' }}>
                  Sign in to continue where you left off
                </p>
                <button
                  onClick={() => switchPanel('login')}
                  style={{
                    padding:      '11px 28px',
                    background:   'transparent',
                    border:       '1.5px solid rgba(255,255,255,0.4)',
                    borderRadius: '10px',
                    color:        '#fff',
                    fontSize:     '13px',
                    fontWeight:    600,
                    cursor:       'pointer',
                    transition:   'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.12)');
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)');
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget.style.background = 'transparent');
                    (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)');
                  }}
                >
                  Sign In
                </button>
              </>
            )}

            {/* Feature bullets */}
            <div style={{ marginTop: '40px', width: '100%' }}>
              {[
                { icon: '🤖', text: 'AI-powered job matching' },
                { icon: '📄', text: 'Resume analysis & scoring' },
                { icon: '⚡', text: 'Real-time alerts' },
              ].map(item => (
                <div
                  key={item.text}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '10px',
                    padding:     '8px 0',
                    borderBottom:'1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
