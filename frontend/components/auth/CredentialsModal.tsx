/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Tilt from 'react-parallax-tilt';
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

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const strength = zxcvbn(password).score;
  const strengthMeta = STRENGTH_META[strength];
  const activeRole = ROLES[role];

  useEffect(() => {
    if (user) {
      onClose();
      router.push(roleRedirectPath(user.role));
    }
  }, [user, onClose, router]);

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.24)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
    color: '#F8FAFC',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const selectedRole = panel === 'register' ? role : (loginRole ?? 'candidate');
    window.location.href = `${API_BASE}/auth/oauth/${provider}?mode=${mode}&role=${selectedRole}`;
  };

  const switchPanel = (target: 'login' | 'register') => {
    setPanel(target);
    setPassword('');
    if (target === 'login') setLoginRole(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginRole) return toast.error('Select role first');
    setLoading(true);
    try {
      const { user: u } = await login(email, password);
      if (u.role !== loginRole) return toast.error(`This account is ${u.role}, not ${loginRole}`);
      toast.success('Signed in');
      router.push(roleRedirectPath(u.role));
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength < 2) return toast.error('Password too weak');
    setLoading(true);
    try {
      await register(name, email, password, role);
      toast.success('Account created');
      router.push(roleRedirectPath(role));
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .cred-input:focus {
          border-color: rgba(139,92,246,.70) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,.15) !important;
        }
      `}</style>

      <div
        ref={overlayRef}
        onClick={(e) => e.target === overlayRef.current && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          padding: '1rem',
          background:
            'radial-gradient(circle at 20% 20%, rgba(56,189,248,.18), transparent 35%), radial-gradient(circle at 80% 70%, rgba(236,72,153,.18), transparent 35%), rgba(2,6,23,.75)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Tilt tiltMaxAngleX={4} tiltMaxAngleY={4} glareEnable glareMaxOpacity={0.12} glarePosition="all">
          <div
            style={{
              width: 'min(940px, 95vw)',
              minHeight: 560,
              borderRadius: 24,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,.25)',
              background: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))',
              boxShadow: '0 30px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.35)',
              display: 'grid',
              gridTemplateColumns: '1.1fr .9fr',
            }}
          >
            <div style={{ padding: 30, overflowY: 'auto' }}>
              {panel === 'login' && !loginRole && (
                <>
                  <h2 style={{ color: '#fff', marginBottom: 8, fontSize: 28 }}>Select role to continue</h2>
                  <p style={{ color: 'rgba(255,255,255,.72)', marginBottom: 14 }}>
                    Choose your login mode first.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLoginRole(r)}
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          border: `1px solid ${ROLES[r].border}`,
                          background: ROLES[r].bg,
                          color: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 22 }}>{ROLES[r].icon}</div>
                        <b>{ROLES[r].label}</b>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{ROLES[r].description}</div>
                      </button>
                    ))}
                  </div>

                  <p style={{ marginTop: 14, color: 'rgba(255,255,255,.8)', fontSize: 13 }}>
                    Don&apos;t have an account?{' '}
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
                <form onSubmit={handleLogin}>
                  <button
                    type="button"
                    onClick={() => setLoginRole(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      marginBottom: 10,
                      cursor: 'pointer',
                    }}
                  >
                    ← Change role
                  </button>

                  <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 8 }}>Welcome back</h2>

                  <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
                    <input
                      className="cred-input"
                      style={inputStyle}
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: 'none',
                      color: '#fff',
                      background: loginRole === 'recruiter' ? ROLES.recruiter.gradient : ROLES.candidate.gradient,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.92)',
                        color: '#111827',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FcGoogle /> Google
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.08)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FaGithub /> GitHub
                    </button>
                  </div>
                </form>
              )}

              {panel === 'register' && (
                <form onSubmit={handleSignup}>
                  <h2 style={{ color: '#fff', fontSize: 26, marginBottom: 8 }}>Create account</h2>
                  <p style={{ color: 'rgba(255,255,255,.72)', marginBottom: 12 }}>
                    Choose role and create your account
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        style={{
                          border: role === r ? `2px solid ${ROLES[r].accent}` : '1px solid rgba(255,255,255,.2)',
                          borderRadius: 12,
                          padding: 12,
                          color: '#fff',
                          background: role === r ? ROLES[r].bg : 'rgba(255,255,255,.04)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        {ROLES[r].icon} {ROLES[r].label}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <input
                      className="cred-input"
                      style={inputStyle}
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <input
                      className="cred-input"
                      style={inputStyle}
                      type="password"
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
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
                      background: activeRole.gradient,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Creating account...' : `Create ${activeRole.label} account`}
                  </button>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.92)',
                        color: '#111827',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FcGoogle /> Google
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,.22)',
                        background: 'rgba(255,255,255,.08)',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <FaGithub /> GitHub
                    </button>
                  </div>

                  <p style={{ marginTop: 12, color: 'rgba(255,255,255,.78)', fontSize: 13 }}>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchPanel('login')}
                      style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer' }}
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              )}
            </div>

            <div
              style={{
                background:
                  panel === 'register'
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
        </Tilt>
      </div>
    </>
  );
}