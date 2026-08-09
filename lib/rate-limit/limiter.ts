// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";

export class RateLimitError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "rate_limit_exceeded"
  ) {
    super(message);
  }
}

export interface RateLimitRule {
  scope: string;
  rpm?: number | null;
  tpm?: number | null;
}

export interface RateLimitResult {
  allowed: boolean;
  scope: string;
  message?: string;
}

interface SlidingEvent {
  ts: number;
  tokens: number;
}

const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 5 * 60_000;
const buckets = new Map<string, SlidingEvent[]>();

// Periodically drop entries older than the window to bound memory.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_MS;
    for (const [key, arr] of buckets) {
      const pruned = arr.filter((e) => e.ts >= cutoff);
      if (pruned.length === 0) buckets.delete(key);
      else buckets.set(key, pruned);
    }
  }, CLEANUP_INTERVAL_MS);
}

function countInWindow(key: string): SlidingEvent[] {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const arr = (buckets.get(key) ?? []).filter((e) => e.ts >= cutoff);
  return arr;
}

function consume(
  key: string,
  rpm: number | null,
  tpm: number | null,
  tokens: number
): RateLimitResult {
  const now = Date.now();
  const arr = countInWindow(key);
  const count = arr.length;
  const tokenSum = arr.reduce((s, e) => s + e.tokens, 0);

  if (rpm !== null && rpm !== undefined && count >= rpm) {
    return {
      allowed: false,
      scope: key,
      message: `Rate limit exceeded: ${rpm} requests/min for ${key}`,
    };
  }
  if (tpm !== null && tpm !== undefined && tokenSum + tokens > tpm) {
    return {
      allowed: false,
      scope: key,
      message: `Rate limit exceeded: ${tpm} tokens/min for ${key}`,
    };
  }
  arr.push({ ts: now, tokens });
  buckets.set(key, arr);
  return { allowed: true, scope: key };
}

async function dailyRequestCount(apiKeyId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return prisma.usageLog.count({
    where: { apiKeyId, createdAt: { gte: start } },
  });
}

async function monthlyRequestCount(apiKeyId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return prisma.usageLog.count({
    where: { apiKeyId, createdAt: { gte: start } },
  });
}

/**
 * Applies key-level and model-level rate limits.
 * RPM/TPM use an in-memory sliding window (per process).
 * Daily/monthly quotas are computed from persisted usage logs.
 */
export async function checkRateLimits(params: {
  apiKeyId: string;
  apiKeyRpm?: number | null;
  apiKeyTpm?: number | null;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
  modelRules?: RateLimitRule[];
  promptTokens?: number;
}): Promise<RateLimitResult> {
  const tokens = params.promptTokens ?? 0;

  const keyLevel = consume(
    `key:${params.apiKeyId}`,
    params.apiKeyRpm ?? null,
    params.apiKeyTpm ?? null,
    tokens
  );
  if (!keyLevel.allowed) return keyLevel;

  for (const rule of params.modelRules ?? []) {
    const r = consume(
      `model:${rule.scope}`,
      rule.rpm ?? null,
      rule.tpm ?? null,
      tokens
    );
    if (!r.allowed) return r;
  }

  if (params.dailyLimit !== null && params.dailyLimit !== undefined) {
    const used = await dailyRequestCount(params.apiKeyId);
    if (used + 1 > params.dailyLimit) {
      return {
        allowed: false,
        scope: "daily",
        message: `Daily request limit exceeded (${params.dailyLimit}/day)`,
      };
    }
  }

  if (params.monthlyLimit !== null && params.monthlyLimit !== undefined) {
    const used = await monthlyRequestCount(params.apiKeyId);
    if (used + 1 > params.monthlyLimit) {
      return {
        allowed: false,
        scope: "monthly",
        message: `Monthly request quota exceeded (${params.monthlyLimit}/month)`,
      };
    }
  }

  return { allowed: true, scope: "global" };
}
