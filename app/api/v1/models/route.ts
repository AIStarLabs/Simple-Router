// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import { authenticateInboundKey } from "@/lib/services/api-keys";
import { unauthorized } from "@/lib/api";
import { withCors, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return withCors(unauthorized("Missing bearer token"));

  let apiKey;
  try {
    apiKey = await authenticateInboundKey(token);
  } catch (e) {
    return withCors(unauthorized((e as Error).message));
  }

  let models: Array<{ id: string; modelId: string; provider: { name: string } }>;
  if (apiKey.permissions.length > 0) {
    const allowedIds = apiKey.permissions
      .filter((p) => p.enabled)
      .map((p) => p.providerModelId);
    models = await prisma.providerModel.findMany({
      where: { id: { in: allowedIds }, enabled: true, provider: { enabled: true } },
      select: { id: true, modelId: true, provider: { select: { name: true } } },
    });
  } else {
    models = await prisma.providerModel.findMany({
      where: { enabled: true, provider: { enabled: true } },
      select: { id: true, modelId: true, provider: { select: { name: true } } },
    });
  }

  return withCors(
    Response.json({
      object: "list",
      data: models.map((m) => ({
        id: m.modelId,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: m.provider.name,
      })),
    })
  );
}
