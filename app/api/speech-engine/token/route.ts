// API route: GET /api/speech-engine/token
// Mints a short-lived WebRTC conversation token for the Speech Engine.
// Keeps the ElevenLabs API key and Speech Engine ID out of the browser.

import { NextResponse } from 'next/server';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

export async function GET() {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
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
