import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// All protected route prefixes
const PROTECTED = [
  '/dashboard',
  '/jobs',
  '/profile',
  '/resumes',
  '/resume',
  '/settings',
  '/mock-interview',
  '/recommendations',
  '/alerts',
  '/analyze',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some(path => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  // Check for auth token in cookies
  // We also check localStorage-based token via a cookie fallback
  const token = request.cookies.get('jc_token')?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login'); // signals landing page to open modal
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/jobs/:path*',
    '/profile/:path*',
    '/resumes/:path*',
    '/resume/:path*',
    '/settings/:path*',
    '/mock-interview/:path*',
    '/recommendations/:path*',
    '/alerts/:path*',
    '/analyze/:path*',
  ],
};