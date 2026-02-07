'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LoginModal({ open, onClose }: Props) {
  const router = useRouter();
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label="Login">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to continue with JobCrawler
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={async () => {
              await signInWithGoogle();
              onClose();
              router.push('/auth/credentials');
            }}
            className="btn w-full"
          >
            Continue with Google
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary w-full"
          >
            Maybe later
          </button>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree to our Terms & Privacy Policy.
        </div>
      </div>
    </div>
  );
}