/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import zxcvbn from 'zxcvbn';

type Role = 'candidate' | 'recruiter';
type Panel = 'login' | 'register';

const ROLE_CONFIG: Record<Role, {
  label: string;
  icon: string;
  description: string;
  color: string;
  bg: string;
  border: string;
}> = {
  candidate: {
    label: 'Job Seeker',
    icon: '🎯',
    description: 'Find jobs, upload resume, get AI-matched',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.35)',
  },
  recruiter: {
    label: 'Recruiter',
    icon: '🏢',
    description: 'Post roles, search candidates, manage pipeline',
    color: '#F472B6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.35)',
  },
};

function roleRedirectPath(role: Role) {
  return role === 'recruiter' ? '/recruiter/dashboard' : '/dashboard';
}

export default function CredentialsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { login, register, user } = useAuth();

  const [panel, setPanel] = useState<Panel>('login');
  const [role, setRole] = useState<Role>('candidate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = zxcvbn(password).score;

  useEffect(() => {
    if (user) {
      onClose();
      router.push(roleRedirectPath(user.role));
    }
  }, [user]);

  if (!open) return null;

  function strengthColor() {
    const map = ['bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-400', 'bg-green-600'];
    return map[strength] ?? 'bg-gray-600';
  }

  function strengthLabel() {
    const map = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
    return map[strength] ?? '';
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
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
    if (strength < 2) return toast.error('Password is too weak');
    try {
      setLoading(true);
      await register(name, email, password, role);
      toast.success('Account created 🎉');
      router.push(roleRedirectPath(role));
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = [
    'w-full px-4 py-3 rounded-xl text-white placeholder-white/40',
    'bg-white/10 border border-white/15',
    'focus:outline-none focus:ring-2 focus:ring-purple-400/60',
    'text-sm transition-all',
  ].join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[900px] min-h-[560px] rounded-3xl overflow-hidden shadow-2xl">
        {/* Glass base */}
        <div className="absolute inset-0 bg-[#0B0F1A]/90 backdrop-blur-2xl border border-white/10 rounded-3xl" />

        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

        {/* Content wrapper */}
        <div className="relative flex h-full min-h-[560px]">

          {/* ── LEFT PANEL ── */}
          <div className={`w-1/2 flex items-center justify-center p-10 transition-all duration-500 ${panel === 'register' ? 'opacity-0 pointer-events-none -translate-x-4' : ''}`}>
            {panel === 'login' && (
              <form onSubmit={handleLogin} className="w-full max-w-sm">
                <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-sm text-white/40 mb-7">Sign in to your account</p>

                <div className="space-y-3">
                  <input type="email" placeholder="Email address" value={email}
                    onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  <input type="password" placeholder="Password" value={password}
                    onChange={e => setPassword(e.target.value)} className={inputClass} required />
                </div>

                <button type="submit" disabled={loading}
                  className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all">
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>

                <div className="flex gap-2 mt-3">
                  <button type="button"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-gray-700 text-sm font-medium hover:bg-white/90">
                    <FcGoogle size={18} /> Google
                  </button>
                  <button type="button"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm hover:bg-white/15">
                    <FaGithub size={16} /> GitHub
                  </button>
                </div>

                <p className="text-center text-white/40 text-xs mt-5">
                  No account?{' '}
                  <button type="button" onClick={() => setPanel('register')}
                    className="text-purple-400 hover:underline">Create one</button>
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT PANEL (register) ── */}
          <div className={`absolute inset-0 flex items-center justify-center p-10 transition-all duration-500 ${panel === 'register' ? 'opacity-100' : 'opacity-0 pointer-events-none translate-x-4'}`}>
            {panel === 'register' && (
              <form onSubmit={handleSignup} className="w-full max-w-lg">
                <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
                <p className="text-sm text-white/40 mb-6">Choose your role to get started</p>

                {/* ── ROLE SELECTOR — the key addition ── */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([key, cfg]) => {
                    const isSelected = role === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRole(key)}
                        style={{
                          background: isSelected ? cfg.bg : 'rgba(255,255,255,0.04)',
                          borderColor: isSelected ? cfg.border : 'rgba(255,255,255,0.1)',
                          boxShadow: isSelected ? `0 0 20px ${cfg.color}22` : 'none',
                        }}
                        className="relative p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:border-white/20"
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: cfg.color }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                        <div className="text-2xl mb-2">{cfg.icon}</div>
                        <div className="text-sm font-600 text-white mb-1" style={{ fontWeight: 600 }}>{cfg.label}</div>
                        <div className="text-xs text-white/40 leading-relaxed">{cfg.description}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input placeholder="Full name" value={name}
                    onChange={e => setName(e.target.value)} className={inputClass} required />
                  <input type="email" placeholder="Email address" value={email}
                    onChange={e => setEmail(e.target.value)} className={inputClass} required />
                </div>
                <div className="mb-2">
                  <input type="password" placeholder="Create a password" value={password}
                    onChange={e => setPassword(e.target.value)} className={`${inputClass} w-full`} required />
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mb-4">
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor() : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-white/30">{strengthLabel()}</p>
                  </div>
                )}

                {/* Role confirmation banner */}
                <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2"
                  style={{ background: ROLE_CONFIG[role].bg, border: `1px solid ${ROLE_CONFIG[role].border}` }}>
                  <span className="text-base">{ROLE_CONFIG[role].icon}</span>
                  <span className="text-xs" style={{ color: ROLE_CONFIG[role].color }}>
                    Registering as <strong>{ROLE_CONFIG[role].label}</strong> —{' '}
                    {role === 'recruiter' ? 'access recruiter dashboard & candidate search' : 'access job matches & resume analysis'}
                  </span>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: `linear-gradient(135deg, ${ROLE_CONFIG[role].color}cc, ${ROLE_CONFIG[role].color})` }}>
                  {loading ? 'Creating account…' : `Create ${ROLE_CONFIG[role].label} Account →`}
                </button>

                <p className="text-center text-white/40 text-xs mt-4">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setPanel('login')}
                    className="text-purple-400 hover:underline">Sign in</button>
                </p>
              </form>
            )}
          </div>

          {/* ── SIDE PANEL (decorative) ── */}
          <div className={`absolute top-0 bottom-0 w-1/2 transition-all duration-500 pointer-events-none
            ${panel === 'login' ? 'left-1/2' : 'left-0'}`}>
            <div className="h-full w-full flex flex-col items-center justify-center text-center p-12"
              style={{ background: 'linear-gradient(135deg, #312E81 0%, #6D28D9 50%, #7C3AED 100%)' }}>
              {panel === 'login' ? (
                <>
                  <div className="text-5xl mb-4">👋</div>
                  <h3 className="text-2xl font-bold text-white mb-3">New here?</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">
                    Join as a job seeker or recruiter and unlock AI-powered career tools
                  </p>
                  <button onClick={() => setPanel('register')}
                    className="pointer-events-auto px-6 py-2.5 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 transition-all">
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">✨</div>
                  <h3 className="text-2xl font-bold text-white mb-3">Welcome back!</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">
                    Sign in to continue where you left off
                  </p>
                  <button onClick={() => setPanel('login')}
                    className="pointer-events-auto px-6 py-2.5 rounded-xl border border-white/30 text-white text-sm hover:bg-white/10 transition-all">
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}