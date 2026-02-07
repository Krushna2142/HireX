'use client';
//frontend/app/auth/credentials/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getFirebaseAuth } from '@/lib/firebase/Client';

export default function CredentialsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Get Firebase ID token
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const idToken = await currentUser.getIdToken();

      const endpoint = mode === 'create' 
        ? '/api/auth/credentials/create' 
        : '/api/auth/credentials/verify';

      const body = mode === 'create'
        ? { username, password, role }
        : { username, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process credentials');
      }

      // Store credentials completion status and user info
      localStorage.setItem('credentialsComplete', 'true');
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('username', username);

      router.push('/dashboard');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
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

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

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

        {mode === 'create' && (
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
        )}

        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          aria-label="Username"
          aria-describedby={loading ? "loading-message" : undefined}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          aria-label="Password"
          aria-describedby={loading ? "loading-message" : undefined}
        />

        <Button type="submit" className="w-full" disabled={loading}>
          <span id="loading-message" className="sr-only">
            {loading && 'Form is processing, please wait'}
          </span>
          {loading ? 'Processing...' : mode === 'create' ? 'Create account' : 'Verify and continue'}
        </Button>
      </form>
    </div>
  );
}