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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-4">
          {mode === 'create' ? 'Create Credentials' : 'Login with Credentials'}
        </h2>

        {error && (
          <p className="text-red-500 text-sm mb-3">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Mode Selection */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
              />
              New
            </label>

            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={mode === 'login'}
                onChange={() => setMode('login')}
              />
              Existing
            </label>
          </div>

          {/* Role Selection */}
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={role === 'candidate'}
                onChange={() => setRole('candidate')}
              />
              Candidate
            </label>

            <label className="flex items-center gap-1">
              <input
                type="radio"
                checked={role === 'recruiter'}
                onChange={() => setRole('recruiter')}
              />
              Recruiter
            </label>
          </div>

          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
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
            className="text-sm text-gray-500 w-full"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
