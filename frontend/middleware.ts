import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/admin',
  '/recruiter',
  '/candidate',
  '/placement',
  '/saved-jobs',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const hasLegacy = Boolean(request.cookies.get('jc_token')?.value);
  const hasSupabase = Boolean(request.cookies.get('hx_session')?.value);

  if (!hasLegacy && !hasSupabase) {
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
    '/admin/:path*',
    '/recruiter/:path*',
    '/candidate/:path*',
    '/placement/:path*',
    '/saved-jobs/:path*',
  ],
};