// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('jc_token')?.value;

  // Unprotected routes
  const publicRoutes = ['/', '/auth'];
  if (publicRoutes.some(r => pathname.startsWith(r))) return NextResponse.next();

  // No token → redirect to home
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/recruiter/:path*', '/resume/:path*'],
};