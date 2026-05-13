/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';
import { useAuth } from '@/components/providers/AuthProvider';
import { roleRedirectPath, type PublicAuthRole } from '@/lib/auth';

type RoleMeta = {
  label: string;
  icon: string;
  description: string;
  accent: string;
  bg: string;
  border: string;
  gradient: string;
};

const ROLES: Record<PublicAuthRole, RoleMeta> = {
  candidate: {
    label: 'Job Seeker',
    icon: '🎯',
    description: 'Upload resume, get AI-matched to jobs, track applications',
    accent: '#38BDF8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.40)',
    gradient: 'linear-gradient(135deg,#0369A1,#0EA5E9)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, search candidates, manage hiring pipeline',
    accent: '#F472B6',
    bg: 'rgba(244,114,182,0.12)',
    border: 'rgba(244,114,182,0.40)',
    gradient: 'linear-gradient(135deg,#9D174D,#EC4899)',
  },
};

const ROLE_OPTIONS = Object.entries(ROLES) as Array<[PublicAuthRole, RoleMeta]>;

const STRENGTH_META = [
  { color: '#EF4444', label: 'Very weak' },
  { color: '#F97316', label: 'Weak' },
  { color: '#EAB308', label: 'Fair' },
  { color: '#22C55E', label: 'Strong' },
  { color: '#16A34A', label: 'Very strong' },
];

export default function CredentialsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { login, register, user } = useAuth();

  const [panel, setPanel] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<PublicAuthRole>('candidate');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const passwordStrength = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  const strengthMeta = passwordStrength
    ? STRENGTH_META[passwordStrength.score]
    : null;

  useEffect(() => {
    if (!open) {
      setLoading(false);
      setName('');
      setEmail('');
      setPassword('');
      setPanel('login');
      setRole('candidate');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;

    onClose();
    router.replace(roleRedirectPath(user.role));
  }, [open, user, onClose, router]);

  if (!open) return null;

  const closeModal = () => {
    if (loading) return;
    onClose();
  };

  const validateForm = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error('Email is required');
      return false;
    }

    if (!cleanEmail.includes('@')) {
      toast.error('Enter a valid email');
      return false;
    }

    if (!password) {
      toast.error('Password is required');
      return false;
    }

    if (panel === 'register') {
      if (!name.trim()) {
        toast.error('Full name is required');
        return false;
      }

      if (password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (panel === 'login') {
        const res = await login(email.trim().toLowerCase(), password);

        toast.success('Signed in successfully');
        onClose();
        router.replace(roleRedirectPath(res.user.role));
        return;
      }

      const res = await register(
        name.trim(),
        email.trim().toLowerCase(),
        password,
        role,
      );

      toast.success('Account created successfully');
      onClose();
      router.replace(roleRedirectPath(res.user.role));
    } catch (error: any) {
      const message =
        error?.message ||
        (panel === 'login' ? 'Login failed' : 'Registration failed');

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const url = `${API_BASE}/auth/oauth/${provider}?role=${role}&mode=${mode}`;
    window.location.href = url;
  };

  const switchPanel = (nextPanel: 'login' | 'register') => {
    setPanel(nextPanel);
    setPassword('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background:
          'radial-gradient(circle at top, rgba(14,165,233,0.16), rgba(2,6,23,0.88) 45%, rgba(2,6,23,0.96))',
        backdropFilter: 'blur(14px)',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 24,
          border: '1px solid rgba(148,163,184,0.22)',
          background:
            'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
          boxShadow:
            '0 24px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
          color: '#E5E7EB',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '22px 24px 16px',
            borderBottom: '1px solid rgba(148,163,184,0.16)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <h2
              id="credentials-modal-title"
              style={{
                margin: 0,
                fontSize: 24,
                lineHeight: 1.1,
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              {panel === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                color: '#94A3B8',
                fontSize: 14,
              }}
            >
              {panel === 'login'
                ? 'Sign in to continue your JobCrawler journey.'
                : 'Choose your role and start building your profile.'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={loading}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.22)',
              background: 'rgba(15,23,42,0.8)',
              color: '#CBD5E1',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 20,
              lineHeight: '32px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: 4,
              borderRadius: 16,
              background: 'rgba(15,23,42,0.75)',
              border: '1px solid rgba(148,163,184,0.14)',
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => switchPanel('login')}
              style={{
                padding: '11px 12px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: panel === 'login' ? '#020617' : '#CBD5E1',
                background:
                  panel === 'login'
                    ? 'linear-gradient(135deg,#38BDF8,#A78BFA)'
                    : 'transparent',
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => switchPanel('register')}
              style={{
                padding: '11px 12px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: panel === 'register' ? '#020617' : '#CBD5E1',
                background:
                  panel === 'register'
                    ? 'linear-gradient(135deg,#38BDF8,#A78BFA)'
                    : 'transparent',
              }}
            >
              Register
            </button>
          </div>

          {panel === 'register' && (
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: 10,
                  color: '#CBD5E1',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Select role
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                }}
              >
                {ROLE_OPTIONS.map(([key, item]) => {
                  const active = role === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      style={{
                        textAlign: 'left',
                        padding: 14,
                        borderRadius: 16,
                        border: `1px solid ${
                          active ? item.border : 'rgba(148,163,184,0.16)'
                        }`,
                        background: active ? item.bg : 'rgba(15,23,42,0.55)',
                        color: '#E5E7EB',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 8 }}>
                        {item.icon}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          marginBottom: 4,
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: '#94A3B8',
                          lineHeight: 1.35,
                        }}
                      >
                        {item.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {panel === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  style={{
                    display: 'block',
                    marginBottom: 7,
                    color: '#CBD5E1',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Full name
                </label>
                <input
                  id="auth-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                style={{
                  display: 'block',
                  marginBottom: 7,
                  color: '#CBD5E1',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Email
              </label>
              <input
                id="auth-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                type="email"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                htmlFor="auth-password"
                style={{
                  display: 'block',
                  marginBottom: 7,
                  color: '#CBD5E1',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Password
              </label>
              <input
                id="auth-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={
                  panel === 'login' ? 'current-password' : 'new-password'
                }
                type="password"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleSubmit();
                  }
                }}
                style={inputStyle}
              />

              {panel === 'register' && strengthMeta && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 999,
                      background: 'rgba(148,163,184,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${((passwordStrength?.score ?? 0) + 1) * 20}%`,
                        height: '100%',
                        borderRadius: 999,
                        background: strengthMeta.color,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      color: strengthMeta.color,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {strengthMeta.label}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 18,
              padding: '13px 16px',
              borderRadius: 16,
              border: 'none',
              background: loading
                ? 'linear-gradient(135deg,#475569,#64748B)'
                : 'linear-gradient(135deg,#38BDF8,#A78BFA,#F472B6)',
              color: '#020617',
              fontWeight: 900,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 16px 36px rgba(56,189,248,0.18)',
            }}
          >
            {loading
              ? panel === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : panel === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '18px 0',
              color: '#64748B',
              fontSize: 12,
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#1E293B' }} />
            or continue with
            <div style={{ flex: 1, height: 1, background: '#1E293B' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              style={oauthButtonStyle}
            >
              <FcGoogle size={18} />
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              style={oauthButtonStyle}
            >
              <FaGithub size={18} />
              GitHub
            </button>
          </div>

          <p
            style={{
              margin: '18px 0 0',
              textAlign: 'center',
              color: '#94A3B8',
              fontSize: 13,
            }}
          >
            {panel === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() =>
                switchPanel(panel === 'login' ? 'register' : 'login')
              }
              style={{
                border: 'none',
                background: 'transparent',
                color: '#38BDF8',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {panel === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.22)',
  outline: 'none',
  background: 'rgba(15,23,42,0.72)',
  color: '#E5E7EB',
  fontSize: 14,
};

const oauthButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.65)',
  color: '#E5E7EB',
  fontWeight: 800,
  cursor: 'pointer',
};