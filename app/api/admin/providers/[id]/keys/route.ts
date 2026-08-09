// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";
import { addProviderKey, testProviderConnection } from "@/lib/services/providers";
import { providerKeySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/admin/providers/[id]/keys">;

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  const keys = await prisma.providerAPIKey.findMany({
    where: { providerId: id },
    orderBy: { priority: "asc" },
  });
  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      providerId: k.providerId,
      name: k.name,
      apiKey: "••••••••",
      organization: k.organization,
      priority: k.priority,
      enabled: k.enabled,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    })),
  });
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
  const parsed = providerKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const key = await addProviderKey(id, parsed.data);
    return NextResponse.json(
      {
        key: {
          id: key.id,
          providerId: key.providerId,
          name: key.name,
          organization: key.organization,
          priority: key.priority,
          enabled: key.enabled,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  return POST(req, ctx);
}

// Test the first enabled key for a provider
export async function PATCH(_req: Request, ctx: Ctx) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const { id } = await ctx.params;
  try {
    const health = await testProviderConnection(id);
    return NextResponse.json({ health });
  } catch (e) {
    return NextResponse.json(
      { health: { ok: false, message: (e as Error).message ?? "Connection failed" } },
      { status: 200 }
    );
  }
}
