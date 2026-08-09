// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { getProvider, updateProvider, deleteProvider } from "@/lib/services/providers";
import { providerUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/providers/[id]">;

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const provider = await getProvider(id);
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ provider });
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
  const parsed = providerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const provider = await updateProvider(id, parsed.data);
    return NextResponse.json({ provider });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  try {
    await deleteProvider(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
