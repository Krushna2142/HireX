import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const collection = await adminDb.collection('applications').get();
    const applications = collection.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}