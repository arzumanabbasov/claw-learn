import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Skip auth in local dev when Google OAuth credentials aren't configured.
const DEV_BYPASS =
  process.env.NODE_ENV === 'development' &&
  (!process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID.startsWith('replace_'));

export async function proxy(req: NextRequest) {
  if (DEV_BYPASS) return NextResponse.next();
  // auth() with authorized callback automatically redirects to /login
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (auth as any)(req);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg|.*\\.png|login|api).*)',
  ],
};
