// GET /api/debug — shows which env vars are present (not their values)
// Remove this file after diagnosing the issue.
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  // Only allow authenticated users to see this
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    env: {
      OPENAI_API_KEY:        !!process.env.OPENAI_API_KEY,
      OPENAI_BASE_URL:       process.env.OPENAI_BASE_URL ?? '(not set)',
      OPENAI_MODEL:          process.env.OPENAI_MODEL ?? '(not set)',
      GEMINI_API_KEY:        !!process.env.GEMINI_API_KEY,
      ELEVENLABS_API_KEY:    !!process.env.ELEVENLABS_API_KEY,
      AUTH_SECRET:           !!process.env.AUTH_SECRET,
      GOOGLE_CLIENT_ID:      !!process.env.GOOGLE_CLIENT_ID,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
    },
  });
}
