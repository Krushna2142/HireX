/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
    description: 'Upload resume, match with jobs, track applications',
    accent: '#38BDF8',
    bg: 'rgba(56,189,248,0.12)',
    border: 'rgba(56,189,248,0.40)',
    gradient: 'linear-gradient(135deg,#0369A1,#0EA5E9)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, shortlist candidates, manage hiring',
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

  const [showPassword, setShowPassword] = useState(false);
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
      setShowPassword(false);
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
    setShowPassword(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="credentials-modal-title"
      style={overlayStyle}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal();
        }
      }}
    >
      <div
        style={{
          ...modalStyle,
          maxWidth: panel === 'register' ? 440 : 420,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        <div style={headerStyle}>
          <div>
            <h2 id="credentials-modal-title" style={titleStyle}>
              {panel === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={subtitleStyle}>
              {panel === 'login'
                ? 'Sign in to continue your HireX journey.'
                : 'Choose role and create your HireX profile.'}
            </p>
          </div>

          <button
            type="button"
            onClick={closeModal}
            disabled={loading}
            aria-label="Close"
            style={closeButtonStyle}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          <div style={switchStyle}>
            <button
              type="button"
              onClick={() => switchPanel('login')}
              style={{
                ...switchButtonStyle,
                ...(panel === 'login' ? activeSwitchButtonStyle : {}),
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => switchPanel('register')}
              style={{
                ...switchButtonStyle,
                ...(panel === 'register' ? activeSwitchButtonStyle : {}),
              }}
            >
              Register
            </button>
          </div>

          {panel === 'register' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Select role</label>

              <div style={roleGridStyle}>
                {ROLE_OPTIONS.map(([key, item]) => {
                  const active = role === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRole(key)}
                      style={{
                        ...roleButtonStyle,
                        border: `1px solid ${
                          active ? item.border : 'rgba(148,163,184,0.16)'
                        }`,
                        background: active ? item.bg : 'rgba(15,23,42,0.55)',
                      }}
                    >
                      <div style={{ fontSize: 18 }}>{item.icon}</div>

                      <div>
                        <div style={roleTitleStyle}>{item.label}</div>
                        <div style={roleDescStyle}>{item.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: panel === 'register' ? 9 : 11 }}>
            {panel === 'register' && (
              <div>
                <label htmlFor="auth-name" style={labelStyle}>
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
              <label htmlFor="auth-email" style={labelStyle}>
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
              <label htmlFor="auth-password" style={labelStyle}>
                Password
              </label>

              <div style={passwordWrapStyle}>
                <input
                  id="auth-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete={
                    panel === 'login' ? 'current-password' : 'new-password'
                  }
                  type={showPassword ? 'text' : 'password'}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleSubmit();
                    }
                  }}
                  style={{
                    ...inputStyle,
                    paddingRight: 82,
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  style={showButtonStyle}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {panel === 'login' && (
                <div style={{ textAlign: 'right', marginTop: 7 }}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push('/auth/forgot-password');
                    }}
                    style={forgotButtonStyle}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {panel === 'register' && strengthMeta && (
                <div style={{ marginTop: 8 }}>
                  <div style={strengthTrackStyle}>
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
                      marginTop: 5,
                      color: strengthMeta.color,
                      fontSize: 11,
                      fontWeight: 800,
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
              ...submitButtonStyle,
              marginTop: panel === 'register' ? 13 : 16,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
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

          <div style={dividerStyle}>
            <div style={lineStyle} />
            <span>or continue with</span>
            <div style={lineStyle} />
          </div>

          <div style={oauthGridStyle}>
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

          <p style={bottomTextStyle}>
            {panel === 'login'
              ? "Don't have an account?"
              : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() =>
                switchPanel(panel === 'login' ? 'register' : 'login')
              }
              style={linkButtonStyle}
            >
              {panel === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 14,
  background:
    'radial-gradient(circle at top, rgba(14,165,233,0.16), rgba(2,6,23,0.88) 45%, rgba(2,6,23,0.96))',
  backdropFilter: 'blur(14px)',
};

const modalStyle: CSSProperties = {
  width: '100%',
  borderRadius: 22,
  border: '1px solid rgba(148,163,184,0.22)',
  background:
    'linear-gradient(145deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
  boxShadow:
    '0 24px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
  color: '#E5E7EB',
};

const headerStyle: CSSProperties = {
  padding: '18px 20px 13px',
  borderBottom: '1px solid rgba(148,163,184,0.16)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 22,
  lineHeight: 1.1,
  fontWeight: 900,
  letterSpacing: '-0.04em',
};

const subtitleStyle: CSSProperties = {
  margin: '7px 0 0',
  color: '#94A3B8',
  fontSize: 13,
};

const closeButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 999,
  border: '1px solid rgba(148,163,184,0.22)',
  background: 'rgba(15,23,42,0.8)',
  color: '#CBD5E1',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: '30px',
};

const bodyStyle: CSSProperties = {
  padding: 18,
};

const switchStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  padding: 4,
  borderRadius: 15,
  background: 'rgba(15,23,42,0.75)',
  border: '1px solid rgba(148,163,184,0.14)',
  marginBottom: 14,
};

const switchButtonStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 11,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 800,
  color: '#CBD5E1',
  background: 'transparent',
};

const activeSwitchButtonStyle: CSSProperties = {
  color: '#020617',
  background: 'linear-gradient(135deg,#38BDF8,#A78BFA)',
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#CBD5E1',
  fontSize: 12,
  fontWeight: 800,
};

const roleGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const roleButtonStyle: CSSProperties = {
  textAlign: 'left',
  padding: 10,
  borderRadius: 14,
  color: '#E5E7EB',
  cursor: 'pointer',
  display: 'grid',
  gridTemplateColumns: '24px 1fr',
  gap: 7,
  alignItems: 'start',
};

const roleTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 2,
};

const roleDescStyle: CSSProperties = {
  fontSize: 10,
  color: '#94A3B8',
  lineHeight: 1.3,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 13px',
  borderRadius: 13,
  border: '1px solid rgba(148,163,184,0.22)',
  outline: 'none',
  background: 'rgba(15,23,42,0.72)',
  color: '#E5E7EB',
  fontSize: 14,
};

const passwordWrapStyle: CSSProperties = {
  position: 'relative',
};

const showButtonStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: 8,
  transform: 'translateY(-50%)',
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(2,6,23,0.7)',
  color: '#93C5FD',
  borderRadius: 10,
  padding: '6px 10px',
  fontSize: 11,
  fontWeight: 900,
  cursor: 'pointer',
};

const forgotButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#38BDF8',
  fontWeight: 850,
  cursor: 'pointer',
  fontSize: 12,
};

const strengthTrackStyle: CSSProperties = {
  height: 6,
  borderRadius: 999,
  background: 'rgba(148,163,184,0.18)',
  overflow: 'hidden',
};

const submitButtonStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 15,
  border: 'none',
  background: 'linear-gradient(135deg,#38BDF8,#A78BFA,#F472B6)',
  color: '#020617',
  fontWeight: 950,
  boxShadow: '0 16px 36px rgba(56,189,248,0.18)',
};

const dividerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '15px 0',
  color: '#64748B',
  fontSize: 12,
};

const lineStyle: CSSProperties = {
  flex: 1,
  height: 1,
  background: '#1E293B',
};

const oauthGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
};

const oauthButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '11px 12px',
  borderRadius: 13,
  border: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(15,23,42,0.65)',
  color: '#E5E7EB',
  fontWeight: 850,
  cursor: 'pointer',
};

const bottomTextStyle: CSSProperties = {
  margin: '15px 0 0',
  textAlign: 'center',
  color: '#94A3B8',
  fontSize: 13,
};

const linkButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#38BDF8',
  fontWeight: 900,
  cursor: 'pointer',
};