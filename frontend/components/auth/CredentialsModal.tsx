'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/Client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

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
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  // Prevent rendering if not open or no user
  if (!open || !user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      const idToken = await fbUser?.getIdToken();

      if (!idToken) {
        setError('No Firebase ID token available');
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
        localStorage.setItem('credentialsComplete', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);
        onClose();
        router.push('/dashboard'); // Ensure redirect to protected route
      } else {
        const errData = await response.json();
        setError(errData.message || 'Credentials setup failed');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (response.ok) {
        alert('Reset link sent (if email exists)');
        setForgotMode(false);
      } else {
        setError('Reset failed');
      }
    } catch (error) {
      console.error(error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
        {forgotMode ? (
          <form onSubmit={handleForgotPassword}>
            <h2 className="text-xl font-semibold">Reset Password</h2>
            <p className="text-sm text-muted-foreground">Enter your email</p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Input
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset'}
            </Button>
            <Button variant="ghost" onClick={() => setForgotMode(false)} className="w-full mt-2">
              Back
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="text-xl font-semibold">Complete Login</h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'create' ? 'Create credentials' : 'Enter your credentials'}
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-4 mt-4">
              <label>
                <input type="radio" checked={mode === 'create'} onChange={() => setMode('create')} /> New User
              </label>
              <label>
                <input type="radio" checked={mode === 'login'} onChange={() => setMode('login')} /> Existing
              </label>
            </div>
            <div className="flex gap-4 mt-2">
              <label>
                <input type="radio" checked={role === 'candidate'} onChange={() => setRole('candidate')} /> Candidate
              </label>
              <label>
                <input type="radio" checked={role === 'recruiter'} onChange={() => setRole('recruiter')} /> Recruiter
              </label>
            </div>
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? 'Processing...' : (mode === 'create' ? 'Create Account' : 'Verify and Continue')}
            </Button>
            <p className="text-sm mt-2">
              <button type="button" onClick={() => setForgotMode(true)} className="text-blue-500 underline">
                Forgot Password?
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}