// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";
import { setModelPermission, removeModelPermission } from "@/lib/services/api-keys";
import { permissionSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/keys/[id]/permissions">;

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const permissions = await prisma.inboundModelPermission.findMany({
    where: { apiKeyId: id },
    include: { providerModel: { include: { provider: true } } },
  });
  return NextResponse.json({ permissions });
}

export async function POST(req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = permissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.enabled === false && !parsed.data.rateLimitRPM && !parsed.data.rateLimitTPM) {
      await removeModelPermission(id, parsed.data.providerModelId);
      return NextResponse.json({ ok: true });
    }
    const permission = await setModelPermission({ apiKeyId: id, ...parsed.data });
    return NextResponse.json({ permission });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
