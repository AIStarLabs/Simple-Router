// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import {
  getUsageSeries,
  getUsageByModel,
  getUsageByProvider,
  getUsageByApiKey,
  getUsageByDay,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 14)));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - days + 1);

  const [series, byModel, byProvider, byApiKey, byDay] = await Promise.all([
    getUsageSeries(days),
    getUsageByModel(since),
    getUsageByProvider(since),
    getUsageByApiKey(since),
    getUsageByDay(since),
  ]);

  return NextResponse.json({ series, byModel, byProvider, byApiKey, byDay });
}
