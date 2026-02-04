/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/firebase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Example: Fetch data from the Firestore collection
    const collection = await adminDb.collection('applications').get();
    const applications = collection.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: applications });
  } catch (error) {
    // Check if the error is an instance of Error, if not provide a fallback message
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}