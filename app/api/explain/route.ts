// API route: POST /api/explain
// Requires authentication. Enforces 3 questions/day/user rate limit.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateScenePlan, resolveConfig } from '@/lib/openai';
import { checkRateLimit } from '@/lib/rateLimit';
import { DEV_BYPASS, DEV_USER } from '@/lib/devAuth';

const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_ITEMS   = 10;
const MAX_HISTORY_MSG_LEN = 300;

export async function POST(req: NextRequest) {
  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    let userId: string;
    if (DEV_BYPASS) {
      userId = DEV_USER.id;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    // ── Rate limit ─────────────────────────────────────────────────────────
    const rl = await checkRateLimit(userId);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `Daily limit reached. You have used all ${rl.limit} questions for today. Come back tomorrow!`,
          code: 'RATE_LIMITED',
          remaining: 0,
          limit: rl.limit,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit':     String(rl.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ── Validate body ──────────────────────────────────────────────────────
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { question, history } = body as Record<string, unknown>;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

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
      safeHistory.push({ role, content: content.slice(0, MAX_HISTORY_MSG_LEN) });
    }

    // ── AI config from env only ────────────────────────────────────────────
    const config = resolveConfig();
    if (!config.apiKey) {
      return NextResponse.json(
        { error: 'Service not configured. Contact the administrator.' },
        { status: 503 }
      );
    }

    const scenePlan = await generateScenePlan(question.trim(), config, safeHistory);

    return NextResponse.json(
      { scenePlan, remaining: rl.remaining - 1, limit: rl.limit },
      {
        headers: {
          'X-RateLimit-Limit':     String(rl.limit),
          'X-RateLimit-Remaining': String(Math.max(0, rl.remaining - 1)),
        },
      }
    );
  } catch (error) {
    console.error('Explain API error:', error);
    return NextResponse.json({ error: 'Failed to generate explanation' }, { status: 500 });
  }
}
