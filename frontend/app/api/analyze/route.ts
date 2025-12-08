/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
export const runtime = 'nodejs';

// Proxies multipart uploads to the Node backend /api/analyze/resume.
// Ensure NEXT_PUBLIC_API_BASE points to your Node service (http://localhost:4000).
export async function POST(req: NextRequest) {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.includes('multipart/form-data')) {
    return new Response(JSON.stringify({ error: 'Expected multipart form-data' }), { status: 400 });
  }

  const formData = await req.formData();

  // Forward multipart to Node proxy which will forward to Python.
  const resp = await fetch(`${API_BASE}/api/analyze/resume`, { method: 'POST', body: formData as any });

  // Pass through response from backend
  const dataText = await resp.text();
  return new Response(dataText, {
    status: resp.status,
    headers: { 'content-type': resp.headers.get('content-type') || 'application/json' },
  });
}