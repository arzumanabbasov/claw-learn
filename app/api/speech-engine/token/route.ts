// API route: GET /api/speech-engine/token
// Mints a short-lived WebRTC conversation token for the Speech Engine.
// Requires authentication — keeps ElevenLabs keys out of the browser.

import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { auth } from '@/auth';
import { DEV_BYPASS } from '@/lib/devAuth';

export async function GET() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  if (!DEV_BYPASS) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const apiKey   = process.env.ELEVENLABS_API_KEY;
  const engineId = process.env.ELEVENLABS_SPEECH_ENGINE_ID;

  if (!apiKey || !engineId) {
    // Return a clear, specific status so the client can distinguish
    // "not configured" (501) from a real server error (5xx).
    return NextResponse.json(
      { error: 'Speech Engine not configured', code: 'NOT_CONFIGURED' },
      { status: 501 }
    );
  }

  try {
    const elevenlabs = new ElevenLabsClient({ apiKey });

    const result = await elevenlabs.conversationalAi.conversations.getWebrtcToken({
      agentId: engineId,
    });

    return NextResponse.json(
      { token: result.token },
      {
        headers: {
          // Tokens are single-use and short-lived — never cache them
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('Speech Engine token error:', err);
    return NextResponse.json({ error: 'Failed to generate conversation token' }, { status: 502 });
  }
}
