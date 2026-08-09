// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/models/[id]">;

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const record = body as Record<string, unknown>;

  try {
    const model = await prisma.providerModel.update({
      where: { id },
      data: {
        displayName: record.displayName === undefined ? undefined : String(record.displayName),
        enabled: record.enabled === undefined ? undefined : Boolean(record.enabled),
        maxContext:
          record.maxContext === undefined
            ? undefined
            : record.maxContext === null
              ? null
              : Number(record.maxContext),
        supportsVision:
          record.supportsVision === undefined ? undefined : Boolean(record.supportsVision),
        supportsImage:
          record.supportsImage === undefined ? undefined : Boolean(record.supportsImage),
        supportsReasoning:
          record.supportsReasoning === undefined ? undefined : Boolean(record.supportsReasoning),
        metadata: record.metadata === undefined ? undefined : String(record.metadata),
      },
    });
    return NextResponse.json({ model });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  try {
    await prisma.providerModel.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
