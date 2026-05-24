// API route: POST /api/explain
// Accepts a question, returns a structured scene plan from any OpenAI-compatible AI

import { NextRequest, NextResponse } from 'next/server';
import { generateScenePlan, resolveConfig } from '@/lib/openai';

// Hard limits — keep costs and prompt-injection surface small
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_ITEMS   = 10;
const MAX_HISTORY_MSG_LEN = 300;

export async function POST(req: NextRequest) {
  try {
    // Reject non-JSON bodies early
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

    const { question, history, aiConfig } = body as Record<string, unknown>;

    // ── Validate question ──────────────────────────────────────────────────
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // ── Validate history ───────────────────────────────────────────────────
    const rawHistory = Array.isArray(history) ? history : [];
    if (rawHistory.length > MAX_HISTORY_ITEMS) {
      return NextResponse.json(
        { error: `History must contain ${MAX_HISTORY_ITEMS} messages or fewer` },
        { status: 400 }
      );
    }

    const safeHistory: Array<{ role: string; content: string }> = [];
    for (const item of rawHistory) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const { role, content } = item as Record<string, unknown>;
      if (typeof role !== 'string' || typeof content !== 'string') continue;
      if (role !== 'user' && role !== 'assistant') continue;
      safeHistory.push({
        role,
        content: content.slice(0, MAX_HISTORY_MSG_LEN),
      });
    }

    // ── AI provider config ─────────────────────────────────────────────────
    // Client may pass settings from the in-app settings page.
    // We only accept apiKey/baseUrl/model — nothing else.
    let clientConfig: { apiKey?: string; baseUrl?: string; model?: string } | undefined;
    if (aiConfig && typeof aiConfig === 'object' && !Array.isArray(aiConfig)) {
      const c = aiConfig as Record<string, unknown>;
      clientConfig = {
        apiKey:  typeof c.apiKey  === 'string' ? c.apiKey  : undefined,
        baseUrl: typeof c.baseUrl === 'string' ? c.baseUrl : undefined,
        model:   typeof c.model   === 'string' ? c.model   : undefined,
      };
    }

    const config = resolveConfig(clientConfig);

    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'No API key configured. Add one in Settings or set OPENAI_API_KEY in your environment.' },
        { status: 503 }
      );
    }

    const scenePlan = await generateScenePlan(question.trim(), config, safeHistory);

    return NextResponse.json({ scenePlan });
  } catch (error) {
    console.error('Explain API error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
