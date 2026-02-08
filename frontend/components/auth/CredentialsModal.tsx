'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/Client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { X, User, Lock, Mail, Loader2 } from 'lucide-react'; // Icons for better UI

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

  // Prevent rendering if not open or no user (Firebase auth required)
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
        router.push('/dashboard'); // Redirect to protected route
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {forgotMode ? 'Reset Password' : 'Complete Your Login'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {forgotMode
                  ? 'Enter your email to reset'
                  : mode === 'create'
                  ? 'Set up your account'
                  : 'Sign in to continue'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => setForgotMode(false)}
                className="w-full text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Account Type</label>
                <div className="flex gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'create'}
                      onChange={() => setMode('create')}
                      className="accent-primary"
                    />
                    <span className="text-sm">New User</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={mode === 'login'}
                      onChange={() => setMode('login')}
                      className="accent-primary"
                    />
                    <span className="text-sm">Existing</span>
                  </label>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <div className="flex gap-3 sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={role === 'candidate'}
                      onChange={() => setRole('candidate')}
                      className="accent-primary"
                    />
                    <span className="text-sm">Candidate</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={role === 'recruiter'}
                      onChange={() => setRole('recruiter')}
                      className="accent-primary"
                    />
                    <span className="text-sm">Recruiter</span>
                  </label>
                </div>
              </div>

              {/* Username */}
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading
                  ? 'Processing...'
                  : mode === 'create'
                  ? 'Create Account'
                  : 'Sign In'}
              </Button>

              {/* Forgot Password Link */}
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="w-full text-muted-foreground hover:text-primary transition-colors text-sm underline"
              >
                Forgot Password?
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}