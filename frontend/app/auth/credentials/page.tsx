'use client';
//frontend/app/auth/credentials/page.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CredentialsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TODO: call backend to create/verify credentials in PostgreSQL

    localStorage.setItem('credentialsComplete', 'true');
    localStorage.setItem('userRole', role);
    localStorage.setItem('username', username);

    router.push('/dashboard');
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

        <Button type="submit" className="w-full">
          {mode === 'create' ? 'Create account' : 'Verify and continue'}
        </Button>
      </form>
    </div>
  );
}