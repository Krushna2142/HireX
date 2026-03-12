'use client';
// frontend/components/auth/CredentialsModal.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';

type AuthMode = 'signup' | 'login' | 'forgot';

export default function CredentialsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { register, login, forgotPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
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
      // client-side validation (prevents native validation tooltips)
      if (mode === 'signup') {
        if (!fullName.trim()) throw new Error('Full name is required.');
        if (!email.trim()) throw new Error('Email is required.');
        if (!password) throw new Error('Password is required.');
        await register(fullName.trim(), email.trim(), password);
        // on success: reset form, close modal, navigate
        resetForm();
        onClose();
        router.push('/dashboard');
      } else if (mode === 'login') {
        if (!email.trim() || !password) throw new Error('Email and password are required.');
        await login(email.trim(), password);
        resetForm();
        onClose();
        router.push('/dashboard');
      } else if (mode === 'forgot') {
        if (!email.trim()) throw new Error('Enter your email first.');
        const msg = await forgotPassword(email.trim());
        setInfo(msg || 'If the email exists, a reset link has been sent. Check your inbox.');
      }
    } catch (err: any) {
      // handle 409 conflict from register
      if (err?.status === 409) {
        setError('An account with this email already exists. Please log in.');
        setMode('login');
      } else {
        setError(err?.message || 'Something went wrong');
      }
    } finally {
      // remove focus to dismiss native tooltips if any and clear loading
      try {
        (document.activeElement as HTMLElement | null)?.blur();
      } catch {
        /* ignore */
      }
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
        onClick={() => {
          resetForm();
          onClose();
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Title */}
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            {mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Login' : 'Forgot Password'}
          </h2>

          {error && (
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          {info && (
            <p className="text-green-400 text-sm mb-4 text-center">{info}</p>
          )}

          {/* disable native validation, we validate manually */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {mode !== 'forgot' && (
              <div className="flex justify-center gap-6 text-sm text-gray-300 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="authMode"
                    type="radio"
                    checked={mode === 'signup'}
                    onChange={() => { resetForm(); setMode('signup'); }}
                    className="accent-blue-500"
                  />
                  New
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    name="authMode"
                    type="radio"
                    checked={mode === 'login'}
                    onChange={() => { resetForm(); setMode('login'); }}
                    className="accent-blue-500"
                  />
                  Existing
                </label>
              </div>
            )}

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={switchToLogin}
                className="flex items-center gap-1 text-sm text-blue-400 hover:underline mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full name
                </label>
                <Input
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="flex gap-2">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="px-3 py-2 bg-gray-800 text-sm rounded"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              {mode !== 'signup' && mode !== 'forgot' && (
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Forgot password?
                </button>
              )}
              <div />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...') :
                mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create account' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm text-gray-300 mt-2">
              {mode === 'signup' ? (
                <>Already have an account? <button type="button" onClick={() => setMode('login')} className="text-blue-400 hover:underline ml-1">Sign in</button></>
              ) : mode === 'login' ? (
                <>Don't have an account? <button type="button" onClick={() => setMode('signup')} className="text-blue-400 hover:underline ml-1">Register</button></>
              ) : null}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}