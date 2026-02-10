'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getFirebaseAuth } from '@/lib/firebase/Client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { X, User, Lock, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      if (!user) {
        setError('You must be signed in first.');
        return;
      }

      const auth = getFirebaseAuth();
      const fbUser = auth.currentUser;
      const idToken = await fbUser?.getIdToken();

      if (!idToken) {
        setError('No Firebase ID token available');
        return;
      }

      const endpoint =
        mode === 'create'
          ? '/auth/credentials/create'
          : '/auth/credentials/verify';

      const response = await fetch(
        `${API_BASE_URL}${endpoint}?token=${encodeURIComponent(idToken)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firebase_uid: user.uid,
            username,
            password,
            role,
          }),
        }
      );

      if (response.ok) {
        localStorage.setItem('credentialsComplete', 'true');
        localStorage.setItem('userRole', role);
        localStorage.setItem('username', username);
        onClose();
        router.push('/dashboard');
      } else {
        let message = 'Credentials setup failed';
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        setError(message);
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
      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail }),
        }
      );

      if (response.ok) {
        alert('Reset link sent (if email exists)');
        setForgotMode(false);
      } else {
        let message = 'Reset failed';
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        setError(message);
      }
    } catch (error) {
      console.error(error);
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Animation variants (corrected: no 'transition' inside)
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 50 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const staggerContainer = {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Header with close button */}
            <motion.div
              className="flex items-center justify-between p-6 border-b border-border"
              variants={itemVariants}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <User className="w-5 h-5 text-white" />
                </motion.div>
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
              <motion.button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Close modal"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </motion.div>

            {/* Form Content */}
            <motion.div
              className="p-6 space-y-6"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {error && (
                  <motion.div
                    className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm"
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {forgotMode ? (
                <motion.form
                  onSubmit={handleForgotPassword}
                  className="space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div className="relative" variants={itemVariants}>
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Your email address"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary"
                      required
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>
                  </motion.div>
                  <motion.button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-muted-foreground hover:text-primary transition-colors text-sm underline"
                    variants={itemVariants}
                  >
                    Back to Login
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Mode Selection */}
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-foreground">Account Type</label>
                    <div className="flex gap-3 sm:gap-4">
                      {['create', 'login'].map((m) => (
                        <motion.label
                          key={m}
                          className="flex items-center gap-2 cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <input
                            type="radio"
                            checked={mode === m}
                            onChange={() => setMode(m as 'create' | 'login')}
                            className="accent-primary"
                          />
                          <span className="text-sm">{m === 'create' ? 'New User' : 'Existing'}</span>
                        </motion.label>
                      ))}
                    </div>
                  </motion.div>

                  {/* Role Selection */}
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label className="text-sm font-medium text-foreground">Role</label>
                    <div className="flex gap-3 sm:gap-4">
                      {['candidate', 'recruiter'].map((r) => (
                        <motion.label
                          key={r}
                          className="flex items-center gap-2 cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <input
                            type="radio"
                            checked={role === r}
                            onChange={() => setRole(r as 'candidate' | 'recruiter')}
                            className="accent-primary"
                          />
                          <span className="text-sm capitalize">{r}</span>
                        </motion.label>
                      ))}
                    </div>
                  </motion.div>

                  {/* Username */}
                  <motion.div className="relative" variants={itemVariants}>
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary"
                      required
                    />
                  </motion.div>

                  {/* Password */}
                  <motion.div className="relative" variants={itemVariants}>
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 transition-all focus:ring-2 focus:ring-primary"
                      required
                    />
                  </motion.div>

                  {/* Submit Button */}
                  <motion.div variants={itemVariants}>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all hover:scale-105"
                      disabled={loading}
                    >
                      {loading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        mode === 'create' ? 'Create Account' : 'Sign In'
                      )}
                    </Button>
                  </motion.div>

                  {/* Forgot Password Link */}
                  <motion.button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="w-full text-muted-foreground hover:text-primary transition-colors text-sm underline"
                    variants={itemVariants}
                  >
                    Forgot Password?
                  </motion.button>
                </motion.form>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}