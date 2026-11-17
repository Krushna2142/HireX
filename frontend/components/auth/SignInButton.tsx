'use client';

import { Loader2, LogOut, LogIn } from 'lucide-react';
import { useState } from 'react';
import CredentialsModal from './CredentialsModal';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SignInButton() {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <button className="px-4 py-2 text-sm bg-gray-100 rounded-md flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    );
  }

  if (user) {
    return (
      <button
        className="px-4 py-2 text-sm bg-gray-100 rounded-md flex items-center gap-2"
        onClick={logout}
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    );
  }

  return (
    <>
      <button
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <LogIn className="w-4 h-4" />
        Sign In
      </button>

      {/* No onGoogleSignIn prop needed — CredentialsModal calls signInWithGoogle internally via useAuth() */}
      <CredentialsModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}