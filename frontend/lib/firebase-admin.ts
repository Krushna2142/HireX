import { getApps, initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount
  : undefined;

if (!getApps().length) {
  if (!saJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
  }
  initializeApp({ credential: cert(saJson) });
}

export const db = getFirestore();