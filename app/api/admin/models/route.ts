// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { prisma } from "@/lib/db";
import { providerModelSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("providerId");
  const enabled = searchParams.get("enabled");

  const models = await prisma.providerModel.findMany({
    where: {
      ...(providerId ? { providerId } : {}),
      ...(enabled !== null && enabled !== undefined && enabled !== ""
        ? { enabled: enabled === "true" }
        : {}),
    },
    include: {
      provider: { select: { id: true, name: true, type: true, enabled: true } },
      _count: { select: { permissions: true } },
    },
    orderBy: [{ providerId: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ models });
}

export async function POST(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = providerModelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const record = body as { providerId?: string };
  if (!record.providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }

  try {
    const model = await prisma.providerModel.create({
      data: {
        providerId: record.providerId,
        modelId: parsed.data.modelId,
        displayName: parsed.data.displayName ?? null,
        enabled: parsed.data.enabled,
        maxContext: parsed.data.maxContext ?? null,
        supportsVision: parsed.data.supportsVision,
        supportsImage: parsed.data.supportsImage,
        supportsReasoning: parsed.data.supportsReasoning,
        metadata: parsed.data.metadata ?? null,
      },
    });
    return NextResponse.json({ model }, { status: 201 });
  } catch (e) {
    const err = e as { code?: string; message: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "This model already exists for this provider" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
