// API route: POST /api/narrate
// Converts text to speech using ElevenLabs and returns audio

import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam

const MAX_TEXT_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { text, elevenLabsApiKey, elevenLabsVoiceId } = body as Record<string, unknown>;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // Client-supplied key (from in-app settings) takes precedence over env var
    const apiKey =
      (typeof elevenLabsApiKey === 'string' && elevenLabsApiKey.trim()
        ? elevenLabsApiKey.trim()
        : null) ?? process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Voice ID: client setting → env var → default
    const voiceId =
      (typeof elevenLabsVoiceId === 'string' && elevenLabsVoiceId.trim()
        ? elevenLabsVoiceId.trim()
        : null) ??
      process.env.ELEVENLABS_VOICE_ID ??
      DEFAULT_VOICE_ID;

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim().slice(0, MAX_TEXT_LENGTH),
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorText);
      return NextResponse.json({ error: 'Narration service unavailable' }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Narrate API error:', error);
    return NextResponse.json({ error: 'Failed to generate narration' }, { status: 500 });
  }
}
