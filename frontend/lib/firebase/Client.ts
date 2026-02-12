'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// ✅ Initialize Firebase safely (client only)
function getClientApp() {
  if (typeof window === 'undefined') return null;

  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApp();
}

// ✅ Auth (safe for Next.js)
export function getFirebaseAuth(): Auth | null {
  const app = getClientApp();   // ✅ FIXED HERE
  if (!app) return null;
  return getAuth(app);
}

// ✅ Google Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
