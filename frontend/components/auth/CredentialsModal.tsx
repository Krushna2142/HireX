'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CredentialsModal({ open, onClose }: Props) {
  const router = useRouter();
  const { register, login, forgotPassword } = useAuth();

  const [mode, setMode] = useState<'signup' | 'login' | 'forgot'>('signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (!open) return null;

  function resetForm() {
    setError('');
    setInfo('');
    setFullName('');
    setEmail('');
    setPassword('');
    setShowPass(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        await register(fullName, email, password);
        onClose();
        router.push('/dashboard');
      } else if (mode === 'login') {
        await login(email, password);
        onClose();
        router.push('/dashboard');
      } else if (mode === 'forgot') {
        if (!email) {
          throw new Error('Enter your email first.');
        }
        const msg = await forgotPassword(email);
        setInfo(msg || 'If the email exists, a reset link has been sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchToForgot() {
    setError('');
    setInfo('');
    setPassword('');
    setMode('forgot');
  }

  function switchToLogin() {
    setError('');
    setInfo('');
    setPassword('');
    setMode('login');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Title */}
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            {mode === 'signup'
              ? 'Create Account'
              : mode === 'login'
              ? 'Login'
              : 'Forgot Password'}
          </h2>

          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          {info && (
            <p className="text-green-400 text-sm mb-4 text-center">{info}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* New / Existing toggle — only in signup/login modes */}
            {mode !== 'forgot' && (
              <div className="flex justify-center gap-6 text-sm text-gray-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === 'signup'}
                    onChange={() => { resetForm(); setMode('signup'); }}
                  />
                  New
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === 'login'}
                    onChange={() => { resetForm(); setMode('login'); }}
                  />
                  Existing
                </label>
              </div>
            )}

            {/* Back to login link — in forgot mode */}
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={switchToLogin}
                className="flex items-center gap-1 text-sm text-blue-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            )}

            {/* Full Name — only signup */}
            {mode === 'signup' && (
              <Input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            {/* Email — all modes */}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password — only signup and login */}
            {mode !== 'forgot' && (
              <div className="relative">
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Forgot password link — only login mode */}
            {mode === 'login' && (
              <button
                type="button"
                onClick={switchToForgot}
                className="text-xs text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            )}

            {/* Forgot mode description */}
            {mode === 'forgot' && !info && (
              <p className="text-xs text-gray-400 text-center">
                Enter your email and we&apos;ll send you a reset link.
              </p>
            )}

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account'
                : mode === 'login'
                ? 'Login'
                : 'Send Reset Link'}
            </Button>
          </form>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}