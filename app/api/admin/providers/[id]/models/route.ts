// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";
import { seedPresetModels } from "@/lib/services/providers";
import { parseTags } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/providers/[id]/models">;

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const models = await prisma.providerModel.findMany({
    where: { providerId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    models: models.map((m) => ({ ...m, bestTaskTags: parseTags(m.bestTaskTags) })),
  });
}

export async function POST(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;

  try {
    const count = await seedPresetModels(id);
    return NextResponse.json({ ok: true, action: "preset", count });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
