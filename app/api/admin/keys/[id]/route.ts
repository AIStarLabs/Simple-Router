// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import {
  getInboundKey,
  updateInboundKey,
  deleteInboundKey,
  setInboundKeyEnabled,
} from "@/lib/services/api-keys";
import { inboundKeyUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/keys/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const key = await getInboundKey(id);
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ key });
}

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
  const parsed = inboundKeyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.enabled !== undefined && Object.keys(parsed.data).length === 1) {
      const key = await setInboundKeyEnabled(id, parsed.data.enabled);
      return NextResponse.json({ key });
    }
    const key = await updateInboundKey(id, parsed.data);
    return NextResponse.json({ key });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  try {
    await deleteInboundKey(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
