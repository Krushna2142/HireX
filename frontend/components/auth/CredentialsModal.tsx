'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/Client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CredentialsModal({ open, onClose }: Props) {
  const { user } = useAuth();

  const [mode, setMode] = useState<'create' | 'login'>('create');
  const [role, setRole] = useState<'candidate' | 'recruiter'>('candidate');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      const idToken = await fbUser?.getIdToken();
      
      if (!idToken) {
        console.error('No Firebase ID token available');
        return;
      }

      const endpoint = mode === 'create' ? '/api/auth/credentials/create' : '/api/auth/credentials/verify';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ username, password, role }),
      });

      if (response.ok) {
        // Cache locally for faster checks
        localStorage.setItem('credentialsComplete', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);
        onClose();
      } else {
        // Handle error (show toast or alert)
        console.error('Credentials setup failed');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Complete your login">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">Complete your login</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Create your username and password to finish setup.'
              : 'Enter your username and password to continue.'}
          </p>
        </div>

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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : (mode === 'create' ? 'Create account' : 'Verify and continue')}
          </Button>
        </form>
      </div>
    </div>
  );
}