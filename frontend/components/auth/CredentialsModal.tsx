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

export default function CredentialsModal({ open, onClose }: Props) {
  const router = useRouter();
  const { register, login, forgotPassword } = useAuth();

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [fullName, setFullName] = useState('');
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
        if (!fullName.trim()) {
          throw new Error('Full name is required');
        }
        await register(fullName, email, password);
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
    setError('');
    setLoading(true);
    try {
      const msg = await forgotPassword(email);
      setInfo(msg);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
          )}

          {info && (
            <p className="text-green-400 text-sm mb-4 text-center">{info}</p>
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
              />
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

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

            {mode === 'login' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Please wait...'
                : mode === 'signup'
                ? 'Create Account'
                : 'Login'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}