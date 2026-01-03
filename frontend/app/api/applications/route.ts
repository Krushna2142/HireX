/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing auth token' }, { status: 401 });

    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { action, job } = await req.json();
    if (!action || !job) return NextResponse.json({ error: 'action and job required' }, { status: 400 });

    const ref = db.collection('users').doc(uid).collection('applications').doc(job.id || job.url);
    await ref.set({ action, job, ts: Date.now() }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Save failed' }, { status: 500 });
  }
}