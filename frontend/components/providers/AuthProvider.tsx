'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '@/lib/firebase/Client';

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type AuthContextType = {
  user: AuthUser | null;          // The logged-in user's data
  loading: boolean;               // Indicates if the authentication state is loading
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authUnsub: ReturnType<typeof onAuthStateChanged> | null = null;

    if (typeof window !== 'undefined') {
      const auth = getFirebaseAuth();

      // Attach listener for Firebase authentication state changes
      authUnsub = onAuthStateChanged(auth, (fbUser: User | null) => {
        if (fbUser) {
          setUser({
            uid: fbUser.uid,
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    }

    // Cleanup subscription on component unmount
    return () => {
      if (authUnsub) authUnsub();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (typeof window === 'undefined') {
      console.error('Attempting to use sign-in on the server. This is not allowed.');
      return;
    }
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    const auth = getFirebaseAuth();
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOutUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}