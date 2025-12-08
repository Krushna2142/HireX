'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser, Auth as FirebaseAuth } from 'firebase/auth';

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Client-only AuthProvider that lazily loads the firebase client module
 * so no firebase client code runs on the server.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // keep a ref to the firebase Auth instance once loaded (optional)
  const [authInstance, setAuthInstance] = useState<FirebaseAuth | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    async function initAuth() {
      try {
        // Dynamically import the firebase client initializer (client-only)
        const firebaseClient = await import('@/lib/firebase/Client');
        const { onAuthStateChanged } = await import('firebase/auth');

        // getFirebaseAuth will now run in the browser
        const auth = firebaseClient.getFirebaseAuth();
        if (!mounted) return;
        setAuthInstance(auth);

        unsub = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
          if (!mounted) return;
          if (fbUser) {
            setUser({
              uid: fbUser.uid,
              displayName: fbUser.displayName ?? null,
              email: fbUser.email ?? null,
              photoURL: fbUser.photoURL ?? null,
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch (err) {
        // If anything goes wrong, ensure we stop the loading spinner and log.
        // eslint-disable-next-line no-console
        console.error('Auth initialization error:', err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  // Sign in with Google (dynamic import so it never runs on the server)
  async function signInWithGoogle() {
    try {
      const [{ signInWithPopup }, { googleProvider }] = await Promise.all([
        import('firebase/auth'),
        import('@/lib/firebase/Client'),
      ]);
      const auth = authInstance ?? (await import('@/lib/firebase/Client')).getFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Google sign-in error:', err);
      throw err;
    }
  }

  // Sign out (dynamic import)
  async function handleSignOut() {
    try {
      const { signOut: fbSignOut } = await import('firebase/auth');
      const auth = authInstance ?? (await import('@/lib/firebase/Client')).getFirebaseAuth();
      await fbSignOut(auth);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sign-out error:', err);
      throw err;
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}