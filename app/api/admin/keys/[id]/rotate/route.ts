// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { rotateInboundKey } from "@/lib/services/api-keys";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/keys/[id]/rotate">;

export async function POST(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  try {
    const result = await rotateInboundKey(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
