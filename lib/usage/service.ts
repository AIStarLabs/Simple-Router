// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import type { UsageStatus } from "@prisma/client";
import type { ChatMessage } from "@/lib/providers/types";
import { estimateCost } from "@/lib/usage/cost";

export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function contentTokens(content: unknown): number {
  if (typeof content === "string") return estimateTextTokens(content);
  if (Array.isArray(content)) {
    return content.reduce((sum, part) => {
      if (typeof part === "string") return sum + estimateTextTokens(part);
      const p = part as { type?: string; text?: string };
      if (p.type === "text" && p.text) return sum + estimateTextTokens(p.text);
      return sum + 85; // image part
    }, 0);
  }
  return estimateTextTokens(JSON.stringify(content ?? ""));
}

export function estimatePromptTokens(messages: ChatMessage[], tools?: unknown): number {
  let total = 3;
  for (const msg of messages) {
    total += contentTokens(msg.content) + 4;
    if (msg.name) total += 2;
  }
  if (tools) total += estimateTextTokens(JSON.stringify(tools)) + 8;
  return total;
}

export interface UsageLogInput {
  apiKeyId?: string | null;
  providerId?: string | null;
  providerModelId?: string | null;
  endpoint?: string | null;
  model?: string | null;
  providerType?: string | null;
  requestTokens?: number;
  responseTokens?: number;
  cost?: number;
  latency?: number;
  stream?: boolean;
  status: UsageStatus;
  error?: string | null;
}

export async function logUsage(input: UsageLogInput): Promise<void> {
  const requestTokens = input.requestTokens ?? 0;
  const responseTokens = input.responseTokens ?? 0;
  let cost = input.cost;
  if (cost === undefined && input.providerType && input.model) {
    cost = estimateCost(input.providerType, input.model, requestTokens, responseTokens);
  }
  await prisma.usageLog.create({
    data: {
      apiKeyId: input.apiKeyId ?? null,
      providerId: input.providerId ?? null,
      providerModelId: input.providerModelId ?? null,
      endpoint: input.endpoint ?? null,
      model: input.model ?? null,
      requestTokens,
      responseTokens,
      cost: cost ?? 0,
      latency: input.latency ?? 0,
      stream: input.stream ?? false,
      status: input.status,
      error: input.error ? String(input.error).slice(0, 2000) : null,
    },
  });
}

export async function getUsageStats() {
  const [totalRequests, todayRequests, activeKeys, activeProviders, totalTokens, errorCount] =
    await Promise.all([
      prisma.usageLog.count(),
      prisma.usageLog.count({
        where: { createdAt: { gte: startOfToday() } },
      }),
      prisma.inboundAPIKey.count({ where: { enabled: true } }),
      prisma.provider.count({ where: { enabled: true } }),
      prisma.usageLog.aggregate({
        _sum: { requestTokens: true, responseTokens: true },
      }),
      prisma.usageLog.count({ where: { status: "error" } }),
    ]);

  const latencyAgg = await prisma.usageLog.aggregate({ _avg: { latency: true } });

  return {
    totalRequests,
    todayRequests,
    activeKeys,
    activeProviders,
    requestTokens: totalTokens._sum.requestTokens ?? 0,
    responseTokens: totalTokens._sum.responseTokens ?? 0,
    totalTokens: (totalTokens._sum.requestTokens ?? 0) + (totalTokens._sum.responseTokens ?? 0),
    errorCount,
    averageLatency: Math.round(latencyAgg._avg.latency ?? 0),
  };
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(nDaysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - nDaysAgo);
  return d;
}
