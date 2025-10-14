import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { env } from './lib/env';
import { SessionData } from './lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = [
    '/api/hooks',
    '/api/health',
    '/api/auth/login',
    '/api/jobs',
  ];

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protected routes - skip middleware for now, rely on server-side checks
  // The middleware cookie handling has compatibility issues with iron-session
  // Authentication is handled in each API route via requireAuth()
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
