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
  '/interviews',
  '/recruiter',
  '/candidate',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get('jc_token')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('auth', 'login');
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
    '/interviews/:path*',
    '/recruiter/:path*',
    '/candidate/:path*',
  ],
};