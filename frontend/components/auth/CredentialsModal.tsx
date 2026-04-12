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
  { color: '#EF4444', label: 'Very weak',  bg: 'rgba(239,68,68,0.2)'  },
  { color: '#F97316', label: 'Weak',       bg: 'rgba(249,115,22,0.2)' },
  { color: '#EAB308', label: 'Fair',       bg: 'rgba(234,179,8,0.2)'  },
  { color: '#22C55E', label: 'Strong',     bg: 'rgba(34,197,94,0.2)'  },
  { color: '#16A34A', label: 'Very strong',bg: 'rgba(22,163,74,0.2)'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

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
  }

  // ✅ Updated OAuth handlers with mode + optional role
  function handleGoogleLogin() {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const roleParam = panel === 'register' ? `&role=${role}` : '';
    window.location.href = `${API_BASE}/auth/oauth/google?mode=${mode}${roleParam}`;
  }

  function handleGithubLogin() {
    const mode = panel === 'register' ? 'signup' : 'signin';
    const roleParam = panel === 'register' ? `&role=${role}` : '';
    window.location.href = `${API_BASE}/auth/oauth/github?mode=${mode}${roleParam}`;
  }

  if (!open) return null;

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
      <style>{`
        .cred-input:focus {
          border-color: rgba(139,92,246,0.6) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important;
        }
        .cred-input::placeholder { color: rgba(255,255,255,0.25); }
        .cred-overlay { animation: fadeIn 0.2s ease; }
        .cred-modal { animation: scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1); }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .cred-btn-google:hover { background: rgba(255,255,255,0.95) !important; }
        .cred-btn-github:hover { background: rgba(255,255,255,0.1) !important; }
        .cred-link { color: #A78BFA; cursor: pointer; text-decoration: none; }
        .cred-link:hover { text-decoration: underline; }
      `}</style>

      <div
        ref={overlayRef}
        className="cred-overlay"
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          className="cred-modal"
          style={{
            width: '100%',
            maxWidth: '880px',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            minHeight: '560px',
            background: '#0B0F1A',
          }}
        >
          <div style={{
            flex: 1,
            minWidth: 0,
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflowY: 'auto',
          }}>
            {/* ...keep rest of your JSX exactly same (login/register forms) ... */}
          </div>
        </div>
      </div>
    </>
  );
}