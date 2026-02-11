'use client';
//frontend/app/auth/credentials/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getFirebaseAuth } from '@/lib/firebase/Client';
import axios, { AxiosError } from 'axios';  // Added AxiosError import

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export default function CredentialsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be signed in with Google first.');
      return;
    }

    try {
      setSubmitting(true);

      // Get Firebase ID token for backend verification
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      const idToken = await fbUser?.getIdToken();

      if (!idToken) {
        throw new Error('Unable to get authentication token.');
      }

      const endpoint =
        mode === 'create'
          ? '/auth/credentials/create'
          : '/auth/credentials/verify';

      const res = await axios.post(`${API_BASE_URL}${endpoint}`, {
        firebase_uid: user.uid,
        username,
        password,
        role,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (res.status === 200) {
        // Success logic
        localStorage.setItem('credentialsComplete', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);
        router.push('/dashboard');
      } else {
        throw new Error(`Server error (${res.status}): ${res.data?.message || 'Request failed'}`);
      }
    } catch (err) {
      console.error('Credentials error', err);
      // Fixed TypeScript error: properly handle unknown type with AxiosError check
      const errorMessage = err instanceof AxiosError 
        ? err.response?.data?.message || err.message 
        : err instanceof Error 
        ? err.message 
        : 'Something went wrong';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Complete your login</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === 'create'
          ? 'Create your username and password to finish setup.'
          : 'Enter your username and password to continue.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === 'create'}
              onChange={() => setMode('create')}
            />
            New user
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mode"
              checked={mode === 'login'}
              onChange={() => setMode('login')}
            />
            Existing user
          </label>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === 'candidate'}
              onChange={() => setRole('candidate')}
            />
            Candidate
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
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
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting
            ? 'Please wait...'
            : mode === 'create'
            ? 'Create account'
            : 'Verify and continue'}
        </Button>
      </form>
    </div>
  );
}