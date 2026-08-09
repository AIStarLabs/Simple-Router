// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Number(searchParams.get("limit") ?? 100));
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const status = searchParams.get("status");
  const providerId = searchParams.get("providerId");
  const apiKeyId = searchParams.get("apiKeyId");
  const model = searchParams.get("model");
  const q = searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (providerId) where.providerId = providerId;
  if (apiKeyId) where.apiKeyId = apiKeyId;
  if (model) where.model = model;
  if (q) {
    where.OR = [
      { model: { contains: q } },
      { error: { contains: q } },
      { endpoint: { contains: q } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.usageLog.findMany({
      where,
      include: {
        apiKey: { select: { name: true } },
        provider: { select: { name: true } },
        providerModel: { select: { modelId: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.usageLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}
