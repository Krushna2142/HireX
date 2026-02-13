/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { auth } from '@/lib/firebase/Client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CredentialsModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open || !user) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const fbUser = auth.currentUser;

      if (!fbUser) {
        throw new Error('User not authenticated');
      }

      const idToken = await fbUser.getIdToken();

      const endpoint =
        mode === 'create'
          ? '/auth/credentials/create'
          : '/auth/credentials/verify';

      const response = await axios.post(
        `${API_BASE_URL}${endpoint}`,
        {
          username,
          password,
          role,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (response.status === 200) {
        localStorage.setItem('credentialsComplete', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);

        onClose();
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      let message = 'Something went wrong';

      if (err instanceof AxiosError) {
        message =
          (err.response?.data as any)?.message ||
          err.response?.data?.detail ||
          err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Overlay with Blur */}
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    />

    {/* Modal */}
    <div className="relative w-full max-w-md mx-4">
      <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl animate-fadeIn">

        {/* Title */}
        <h2 className="text-2xl font-semibold text-white mb-6 text-center">
          {mode === 'create'
            ? 'Create Credentials'
            : 'Login with Credentials'}
        </h2>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Mode */}
          <div className="flex justify-center gap-6 text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
                className="accent-purple-500"
              />
              New
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={mode === 'login'}
                onChange={() => setMode('login')}
                className="accent-purple-500"
              />
              Existing
            </label>
          </div>

          {/* Role */}
          <div className="flex justify-center gap-6 text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={role === 'candidate'}
                onChange={() => setRole('candidate')}
                className="accent-purple-500"
              />
              Candidate
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={role === 'recruiter'}
                onChange={() => setRole('recruiter')}
                className="accent-purple-500"
              />
              Recruiter
            </label>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white placeholder-gray-400"
            />

            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white placeholder-gray-400"
            />
          </div>

          {/* Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 transition-all duration-200"
          >
            {loading
              ? 'Please wait...'
              : mode === 'create'
              ? 'Create'
              : 'Login'}
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-400 w-full hover:text-white transition"
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  </div>
);
}