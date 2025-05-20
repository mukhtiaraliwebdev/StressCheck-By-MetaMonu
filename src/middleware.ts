
import { type NextRequest, NextResponse } from 'next/server';

const CLIENT_SESSION_COOKIE_NAME = "clientSession";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/login',
    '/signup',
    '/api/auth', 
    '/stress-check', 
    '/reports' 
  ];

  if (publicPaths.some(path => pathname.startsWith(path)) || pathname === '/') { // Also allow homepage
    return NextResponse.next();
  }

  // For Next.js internal paths, always allow
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const clientSessionActive = request.cookies.get(CLIENT_SESSION_COOKIE_NAME)?.value === 'true';

  if (!clientSessionActive) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    console.log(`[Middleware] No active client session, redirecting to login from ${pathname}`);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[Middleware] Active client session found, allowing access to ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
