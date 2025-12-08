'use client';

import { useAuth } from '../../components/providers/AuthProvider';

export default function SignInPage() {
  const { signInWithGoogle } = useAuth();
  return (
    <main className="page-gradient mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Use your Google account to sign in.</p>
      <button
        className="mt-6 inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
        onClick={() => signInWithGoogle()}
      >
        Sign in with Google
      </button>
    </main>
  );
}