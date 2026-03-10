/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

type Props = {
  open: boolean;
  onClose: () => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function CredentialsModal({ open, onClose }: Props) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setError('Full name is required.');
          return;
        }
        await register(fullName.trim(), email, password, role);
        onClose();
        router.push('/dashboard');
      } else {
        await login(email, password);
        onClose();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Failed to send reset email');
      }

      setInfo('Password reset email sent. Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            {mode === 'signup' ? 'Create Account' : 'Login'}
          </h2>

          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">
              {error}
            </p>
          )}

          {info && (
            <p className="text-green-400 text-sm mb-4 text-center">
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="flex justify-center gap-6 text-sm text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === 'signup'}
                  onChange={() => setMode('signup')}
                />
                New
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === 'login'}
                  onChange={() => setMode('login')}
                />
                Existing
              </label>
            </div>

            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white"
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white"
            />

            <div className="relative">
              <Input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'signup' && (
              <div className="flex justify-center gap-6 text-sm text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={role === 'candidate'}
                    onChange={() => setRole('candidate')}
                  />
                  Candidate
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={role === 'recruiter'}
                    onChange={() => setRole('recruiter')}
                  />
                  Recruiter
                </label>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right text-sm">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-purple-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account'
                : 'Login'}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-400 w-full hover:text-white"
            >
              Cancel
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}