/* eslint-disable import/no-anonymous-default-export */
// Client-only Firebase initializer for Next.js
'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '',
};

function maskKey(key = '') {
  if (!key) return '(missing)';
  if (key.length <= 8) return key.replace(/.(?=.{2})/g, '*');
  return key.slice(0, 4) + key.slice(4, -4).replace(/./g, '*') + key.slice(-4);
}

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.info('[firebase] apiKey:', maskKey(firebaseConfig.apiKey));
  if (!firebaseConfig.apiKey) {
    console.error(
      '[firebase] NEXT_PUBLIC_FIREBASE_API_KEY is not set. Add it to .env.local and restart the dev server.'
    );
  }
}

function ensureClientApp() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client should only be imported on the client side.');
  }
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
}

export function getFirebaseAuth() {
  const app = ensureClientApp();
  return getAuth(app);
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });