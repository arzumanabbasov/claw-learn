// GET /api/me — returns session user + remaining questions today
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getRemainingQuestions } from '@/lib/rateLimit';
import { DEV_BYPASS, DEV_USER } from '@/lib/devAuth';

export async function GET() {
  let user: { id: string; name: string; email: string; image: null | string };

  if (DEV_BYPASS) {
    user = DEV_USER;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ user: null, remaining: 0 }, { status: 401 });
    }
    user = {
      id:    session.user.id,
      name:  session.user.name  ?? '',
      email: session.user.email ?? '',
      image: session.user.image ?? null,
    };
  }

  const remaining = await getRemainingQuestions(user.id);
  return NextResponse.json({ user, remaining, limit: 3 });
}
