// Rate limiting — 3 questions per user per UTC day
// Uses Upstash Redis in production, in-memory fallback for local dev

const DAILY_LIMIT = 3;

// ── Upstash Redis (production) ────────────────────────────────────────────────

function getRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  // Lazy import so local dev without Redis doesn't crash
  const { Redis } = require('@upstash/redis');
  return new Redis({ url, token }) as import('@upstash/redis').Redis;
}

// ── In-memory fallback (local dev) ───────────────────────────────────────────

const memStore = new Map<string, { count: number; day: string }>();

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const day = todayUTC();
  const key = `rl:${userId}:${day}`;

  const redis = getRedis();

  if (redis) {
    // Atomic increment + set TTL to end of day (seconds until midnight UTC)
    const now = new Date();
    const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const ttl = Math.ceil((midnight.getTime() - now.getTime()) / 1000);

    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttl);

    const remaining = Math.max(0, DAILY_LIMIT - count);
    return { allowed: count <= DAILY_LIMIT, remaining, limit: DAILY_LIMIT };
  }

  // In-memory fallback
  const entry = memStore.get(key);
  if (!entry || entry.day !== day) {
    memStore.set(key, { count: 1, day });
    return { allowed: true, remaining: DAILY_LIMIT - 1, limit: DAILY_LIMIT };
  }
  entry.count += 1;
  const remaining = Math.max(0, DAILY_LIMIT - entry.count);
  return { allowed: entry.count <= DAILY_LIMIT, remaining, limit: DAILY_LIMIT };
}

export async function getRemainingQuestions(userId: string): Promise<number> {
  const day = todayUTC();
  const key = `rl:${userId}:${day}`;

  const redis = getRedis();
  if (redis) {
    const count = (await redis.get<number>(key)) ?? 0;
    return Math.max(0, DAILY_LIMIT - count);
  }

  const entry = memStore.get(key);
  if (!entry || entry.day !== day) return DAILY_LIMIT;
  return Math.max(0, DAILY_LIMIT - entry.count);
}
