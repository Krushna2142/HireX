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
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.35)',
    gradient: 'linear-gradient(135deg, #0369A1, #0EA5E9)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, search candidates, manage hiring pipeline',
    accent: '#F472B6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.35)',
    gradient: 'linear-gradient(135deg, #9D174D, #EC4899)',
  },
};

const STRENGTH_META = [
  { color: '#EF4444', label: 'Very weak', bg: 'rgba(239,68,68,0.2)' },
  { color: '#F97316', label: 'Weak', bg: 'rgba(249,115,22,0.2)' },
  { color: '#EAB308', label: 'Fair', bg: 'rgba(234,179,8,0.2)' },
  { color: '#22C55E', label: 'Strong', bg: 'rgba(34,197,94,0.2)' },
  { color: '#16A34A', label: 'Very strong', bg: 'rgba(22,163,74,0.2)' },
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
  const [role, setRole] = useState<UserRole>('candidate'); // signup role
  const [loginRole, setLoginRole] = useState<UserRole | null>(null); // signin role
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

  if (!open) return null;

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
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#F1F5F9',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  };

  return (
    <>
      <div ref={overlayRef} onClick={handleOverlayClick} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: 760, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0B0F1A', padding: 24 }}>
          {panel === 'login' && !loginRole ? (
            <>
              <h2 style={{ color: '#fff', marginBottom: 10 }}>Select login type</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>Choose how you want to sign in</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLoginRole(r)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: `1px solid ${ROLES[r].border}`,
                      background: ROLES[r].bg,
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 20 }}>{ROLES[r].icon}</div>
                    <div style={{ fontWeight: 700 }}>{ROLES[r].label} Login</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{ROLES[r].description}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => switchPanel('register')} style={{ marginTop: 16 }}>Need an account? Create one</button>
            </>
          ) : panel === 'login' ? (
            <form onSubmit={handleLogin}>
              <button type="button" onClick={() => setLoginRole(null)} style={{ marginBottom: 12 }}>← Change role ({loginRole})</button>
              <h2 style={{ color: '#fff' }}>Sign In ({loginRole === 'recruiter' ? 'Recruiter' : 'Job Seeker'})</h2>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Signing in...' : 'Sign In'}</button>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={handleGoogleLogin}><FcGoogle /> Google</button>
                <button type="button" onClick={handleGithubLogin}><FaGithub /> GitHub</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup}>
              <h2 style={{ color: '#fff' }}>Create Account</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {(['candidate', 'recruiter'] as UserRole[]).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)} style={{ border: role === r ? `2px solid ${ROLES[r].accent}` : '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: 10 }}>
                    {ROLES[r].icon} {ROLES[r].label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <input style={inputStyle} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
                <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {password.length > 0 && <p style={{ color: strengthMeta.color, marginTop: 8 }}>{strengthMeta.label}</p>}

              <button type="submit" disabled={loading} style={{ marginTop: 12 }}>
                {loading ? 'Creating account...' : `Create ${ROLES[role].label} Account`}
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" onClick={handleGoogleLogin}><FcGoogle /> Google</button>
                <button type="button" onClick={handleGithubLogin}><FaGithub /> GitHub</button>
              </div>

              <button type="button" onClick={() => switchPanel('login')} style={{ marginTop: 12 }}>
                Already have an account? Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}