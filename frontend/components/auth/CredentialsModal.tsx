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

const ROLES: Record<UserRole, {
  label: string;
  icon: string;
  description: string;
  accent: string;
  bg: string;
  border: string;
  gradient: string;
}> = {
  candidate: {
    label: 'Job Seeker',
    icon: '🎯',
    description: 'Upload resume, get AI-matched to jobs, track applications',
    accent: '#38BDF8',
    bg: 'rgba(56,189,248,0.10)',
    border: 'rgba(56,189,248,0.35)',
    gradient: 'linear-gradient(135deg, #0369A1, #0EA5E9)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, search candidates, manage hiring pipeline',
    accent: '#F472B6',
    bg: 'rgba(244,114,182,0.10)',
    border: 'rgba(244,114,182,0.35)',
    gradient: 'linear-gradient(135deg, #9D174D, #EC4899)',
  },
};

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
  const overlayRef = useRef<HTMLDivElement>(null);

  const [panel, setPanel] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('candidate');
  const [loginRole, setLoginRole] = useState<UserRole | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = zxcvbn(password).score;
  const strengthMeta = STRENGTH_META[strength];
  const activeRole = ROLES[role];

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (user) {
      onClose();
      router.push(roleRedirectPath(user.role));
    }
  }, [user, onClose, router]);

  if (!open) return null;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function switchPanel(target: 'login' | 'register') {
    setPassword('');
    setPanel(target);
    if (target === 'login') setLoginRole(null);
  }

  function handleGoogleLogin() {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const selectedRole = panel === 'register' ? role : (loginRole ?? 'candidate');
    window.location.href = `${API_BASE}/auth/oauth/google?mode=${mode}&role=${selectedRole}`;
  }

  function handleGithubLogin() {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const selectedRole = panel === 'register' ? role : (loginRole ?? 'candidate');
    window.location.href = `${API_BASE}/auth/oauth/github?mode=${mode}&role=${selectedRole}`;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginRole) {
      toast.error('Please select Recruiter or Job Seeker first');
      return;
    }

    setLoading(true);
    try {
      const { user: u } = await login(email, password);

      if (u.role !== loginRole) {
        toast.error(`This account is ${u.role}, not ${loginRole}`);
        return;
      }

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '12px',
    color: '#F1F5F9',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <>
      <style>{`
        .cred-input:focus {
          border-color: rgba(139,92,246,0.7) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15) !important;
        }
        .cred-input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>

      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.14), transparent 35%), radial-gradient(circle at 80% 80%, rgba(236,72,153,0.14), transparent 35%), rgba(3,6,16,0.78)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 920,
            minHeight: 560,
            borderRadius: 24,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            boxShadow: '0 28px 70px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(16px)',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
          }}
        >
          <div style={{ padding: 32, overflowY: 'auto' }}>
            {panel === 'login' && !loginRole && (
              <>
                <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 8 }}>Choose how to sign in</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 18 }}>
                  Select your role first so we route you to the correct experience.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setLoginRole(r)}
                      style={{
                        padding: 18,
                        borderRadius: 16,
                        border: `1px solid ${ROLES[r].border}`,
                        background: ROLES[r].bg,
                        color: '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 24 }}>{ROLES[r].icon}</div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>{ROLES[r].label} Login</div>
                      <div style={{ fontSize: 12, opacity: 0.78, marginTop: 4 }}>{ROLES[r].description}</div>
                    </button>
                  ))}
                </div>

                <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  New here?{' '}
                  <button
                    type="button"
                    onClick={() => switchPanel('register')}
                    style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer' }}
                  >
                    Create account
                  </button>
                </p>
              </>
            )}

            {panel === 'login' && loginRole && (
              <form onSubmit={handleLogin} style={{ maxWidth: 430, margin: '0 auto', width: '100%' }}>
                <div
                  style={{
                    borderRadius: 22,
                    padding: 26,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
                    border: '1px solid rgba(255,255,255,0.20)',
                    backdropFilter: 'blur(14px)',
                    WebkitBackdropFilter: 'blur(14px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setLoginRole(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      marginBottom: 12,
                      fontSize: 13,
                    }}
                  >
                    ← Change role ({loginRole === 'recruiter' ? 'Recruiter' : 'Job Seeker'})
                  </button>

                  <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 18 }}>
                    Sign in as <strong>{loginRole === 'recruiter' ? 'Recruiter' : 'Job Seeker'}</strong>
                  </p>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      className="cred-input"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      required
                    />
                    <input
                      className="cred-input"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      marginTop: 14,
                      padding: '12px',
                      borderRadius: 12,
                      border: 'none',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                      background:
                        loginRole === 'recruiter'
                          ? 'linear-gradient(135deg, #BE185D, #EC4899)'
                          : 'linear-gradient(135deg, #0369A1, #0EA5E9)',
                      boxShadow:
                        loginRole === 'recruiter'
                          ? '0 10px 24px rgba(236,72,153,0.35)'
                          : '0 10px 24px rgba(14,165,233,0.35)',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button type="button" onClick={handleGoogleLogin} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                      <FcGoogle /> Google
                    </button>
                    <button type="button" onClick={handleGithubLogin} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
                      <FaGithub /> GitHub
                    </button>
                  </div>
                </div>
              </form>
            )}

            {panel === 'register' && (
              <form onSubmit={handleSignup}>
                <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 8 }}>Create account</h2>
                <p style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 14 }}>Choose role and sign up</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        border: role === r ? `2px solid ${ROLES[r].accent}` : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 12,
                        padding: 12,
                        color: '#fff',
                        background: role === r ? ROLES[r].bg : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {ROLES[r].icon} {ROLES[r].label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <input className="cred-input" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
                  <input className="cred-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
                  <input className="cred-input" type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
                </div>

                {password.length > 0 && (
                  <p style={{ marginTop: 8, color: strengthMeta.color, fontSize: 12 }}>
                    {strengthMeta.label}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    padding: '12px',
                    borderRadius: 12,
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    background: activeRole.gradient,
                  }}
                >
                  {loading ? 'Creating account...' : `Create ${activeRole.label} account`}
                </button>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={handleGoogleLogin} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', cursor: 'pointer' }}>
                    <FcGoogle /> Google
                  </button>
                  <button type="button" onClick={handleGithubLogin} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer' }}>
                    <FaGithub /> GitHub
                  </button>
                </div>

                <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => switchPanel('login')} style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer' }}>
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>

          <div
            style={{
              background: panel === 'register'
                ? 'linear-gradient(145deg, rgba(30,27,75,0.95), rgba(79,70,229,0.82))'
                : 'linear-gradient(145deg, rgba(49,46,129,0.95), rgba(124,58,237,0.82))',
              color: '#fff',
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 14,
            }}
          >
            <h3 style={{ fontSize: 28, margin: 0 }}>AI Hiring Platform</h3>
            <p style={{ opacity: 0.85 }}>Smart matching, real-time hiring, role-based dashboards.</p>
            <div style={{ opacity: 0.85, fontSize: 13 }}>• AI Resume Analysis</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>• Recruiter Pipeline</div>
            <div style={{ opacity: 0.85, fontSize: 13 }}>• Live Interview Workflow</div>
          </div>
        </div>
      </div>
    </>
  );
}