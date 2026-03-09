/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CredentialsModal({ open, onClose }: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setInfo('Account created. Check email for confirmation.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    if (error) setError(error.message);
    else setInfo('Password reset email sent.');
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

            <Input
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