import { getApps, initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount(): ServiceAccount | undefined {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return undefined;

  // If provided as base64, decode first
  const jsonString = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');

  const parsed = JSON.parse(jsonString) as ServiceAccount;

  // Normalize private_key newlines
  if (parsed.privateKey) {
    parsed.privateKey = parsed.privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
  }

  return parsed;
}

const saJson = parseServiceAccount();

if (!getApps().length) {
  if (!saJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
  }
  initializeApp({ credential: cert(saJson) });
}

export const db = getFirestore();