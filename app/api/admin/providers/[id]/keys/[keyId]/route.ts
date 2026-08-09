// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { updateProviderKey, deleteProviderKey } from "@/lib/services/providers";
import { providerKeySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/providers/[id]/keys/[keyId]">;

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { keyId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = providerKeySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const key = await updateProviderKey(keyId, parsed.data);
    return NextResponse.json({
      key: {
        id: key.id,
        providerId: key.providerId,
        name: key.name,
        organization: key.organization,
        priority: key.priority,
        enabled: key.enabled,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { keyId } = await ctx.params;
  try {
    await deleteProviderKey(keyId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
