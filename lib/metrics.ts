// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import { startOfDay } from "@/lib/usage/service";

export async function getDashboardStats() {
  const today = startOfDay(0);

  const [
    todayRequests,
    yesterdayRequests,
    activeKeys,
    activeProviders,
    tokenAgg,
    costAgg,
    errorCount,
    latencyAgg,
  ] = await Promise.all([
    prisma.usageLog.count({ where: { createdAt: { gte: today } } }),
    prisma.usageLog.count({
      where: {
        createdAt: {
          gte: startOfDay(1),
          lt: today,
        },
      },
    }),
    prisma.inboundAPIKey.count({ where: { enabled: true } }),
    prisma.provider.count({ where: { enabled: true } }),
    prisma.usageLog.aggregate({ _sum: { requestTokens: true, responseTokens: true } }),
    prisma.usageLog.aggregate({ _sum: { cost: true } }),
    prisma.usageLog.count({ where: { status: { not: "success" } } }),
    prisma.usageLog.aggregate({ _avg: { latency: true } }),
  ]);

  return {
    todayRequests,
    yesterdayRequests,
    activeKeys,
    activeProviders,
    requestTokens: tokenAgg._sum.requestTokens ?? 0,
    responseTokens: tokenAgg._sum.responseTokens ?? 0,
    totalTokens: (tokenAgg._sum.requestTokens ?? 0) + (tokenAgg._sum.responseTokens ?? 0),
    totalCost: costAgg._sum.cost ?? 0,
    errorCount,
    averageLatency: Math.round(latencyAgg._avg.latency ?? 0),
  };
}

export interface SeriesPoint {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}

export async function getUsageSeries(days = 14): Promise<SeriesPoint[]> {
  const since = startOfDay(days - 1);
  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      requestTokens: true,
      responseTokens: true,
      cost: true,
      status: true,
    },
  });

  const buckets = new Map<string, SeriesPoint>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, requests: 0, tokens: 0, cost: 0, errors: 0 });
  }

  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.requests += 1;
    bucket.tokens += log.requestTokens + log.responseTokens;
    bucket.cost += log.cost;
    if (log.status === "error" || log.status === "authError" || log.status === "rateLimited") {
      bucket.errors += 1;
    }
  }

  return [...buckets.values()];
}

export interface UsageBreakdownRow {
  key: string;
  label: string;
  requests: number;
  tokens: number;
  cost: number;
}

export async function getUsageByModel(since?: Date): Promise<UsageBreakdownRow[]> {
  const logs = await prisma.usageLog.findMany({
    where: {
      ...(since ? { createdAt: { gte: since } } : {}),
      model: { not: null },
    },
    select: {
      model: true,
      requestTokens: true,
      responseTokens: true,
      cost: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  return aggregateRows(logs, (l) => l.model as string);
}

export async function getUsageByProvider(since?: Date): Promise<UsageBreakdownRow[]> {
  const logs = await prisma.usageLog.findMany({
    where: {
      ...(since ? { createdAt: { gte: since } } : {}),
      providerId: { not: null },
    },
    select: {
      providerId: true,
      requestTokens: true,
      responseTokens: true,
      cost: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const idSet = new Set(logs.map((l) => l.providerId).filter(Boolean) as string[]);
  const providers = await prisma.provider.findMany({
    where: { id: { in: [...idSet] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(providers.map((p) => [p.id, p.name]));

  const rows = aggregateRows(logs, (l) => l.providerId as string);
  return rows.map((r) => ({
    ...r,
    label: nameById.get(r.key) ?? "Unknown",
  }));
}

export async function getUsageByApiKey(since?: Date): Promise<UsageBreakdownRow[]> {
  const logs = await prisma.usageLog.findMany({
    where: {
      ...(since ? { createdAt: { gte: since } } : {}),
      apiKeyId: { not: null },
    },
    select: {
      apiKeyId: true,
      requestTokens: true,
      responseTokens: true,
      cost: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const idSet = new Set(logs.map((l) => l.apiKeyId).filter(Boolean) as string[]);
  const keys = await prisma.inboundAPIKey.findMany({
    where: { id: { in: [...idSet] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(keys.map((k) => [k.id, k.name]));

  const rows = aggregateRows(logs, (l) => l.apiKeyId as string);
  return rows.map((r) => ({
    ...r,
    label: nameById.get(r.key) ?? "Unknown",
  }));
}

function aggregateRows<T extends { requestTokens: number; responseTokens: number; cost: number }>(
  logs: T[],
  keyOf: (log: T) => string
): UsageBreakdownRow[] {
  const map = new Map<string, UsageBreakdownRow>();
  for (const l of logs) {
    const key = keyOf(l);
    const row = map.get(key) ?? { key, label: key, requests: 0, tokens: 0, cost: 0 };
    row.requests += 1;
    row.tokens += l.requestTokens + l.responseTokens;
    row.cost += l.cost;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.requests - a.requests);
}

export async function getUsageByDay(since?: Date): Promise<UsageBreakdownRow[]> {
  const logs = await prisma.usageLog.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    select: {
      createdAt: true,
      requestTokens: true,
      responseTokens: true,
      cost: true,
    },
  });
  const map = new Map<string, UsageBreakdownRow>();
  for (const l of logs) {
    const key = l.createdAt.toISOString().slice(0, 10);
    const row = map.get(key) ?? { key, label: key, requests: 0, tokens: 0, cost: 0 };
    row.requests += 1;
    row.tokens += l.requestTokens + l.responseTokens;
    row.cost += l.cost;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}
