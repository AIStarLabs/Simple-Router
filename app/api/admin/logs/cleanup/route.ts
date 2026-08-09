// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_RETENTION_DAYS = 90;

export async function POST(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  let days = DEFAULT_RETENTION_DAYS;
  try {
    const body = await req.json();
    if (body?.days && typeof body.days === "number") days = Math.max(1, body.days);
  } catch {
    /* use default */
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.usageLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ ok: true, deleted: result.count, days });
}
