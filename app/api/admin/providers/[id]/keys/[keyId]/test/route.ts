// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { testProviderConnection } from "@/lib/services/providers";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/providers/[id]/keys/[keyId]/test">;

export async function POST(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id, keyId } = await ctx.params;
  try {
    const health = await testProviderConnection(id, keyId);
    return NextResponse.json({ health });
  } catch (e) {
    return NextResponse.json(
      { health: { ok: false, message: (e as Error).message } },
      { status: 200 }
    );
  }
}
