// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export class ApiKeyError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "api_key_error"
  ) {
    super(message);
  }
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function maskKey(encrypted: string): string {
  try {
    const plain = decryptSecret(encrypted);
    if (plain.length <= 10) return plain;
    return `${plain.slice(0, 7)}…${plain.slice(-4)}`;
  } catch {
    return "…";
  }
}

export function newInboundKey(): string {
  return `sk-sr-${randomBytes(24).toString("hex")}`;
}

export async function authenticateInboundKey(bearer: string) {
  const key = bearer.trim();
  const record = await prisma.inboundAPIKey.findUnique({
    where: { key: hashApiKey(key) },
    include: {
      permissions: {
        include: { providerModel: { include: { provider: true } } },
      },
    },
  });
  if (!record) throw new ApiKeyError(401, "Invalid API key", "invalid_api_key");
  if (!record.enabled) throw new ApiKeyError(403, "API key is disabled", "key_disabled");
  return record;
}

export async function getInboundKey(id: string) {
  const record = await prisma.inboundAPIKey.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          providerModel: { include: { provider: true } },
        },
      },
      _count: { select: { usageLogs: true } },
    },
  });
  if (!record) return null;
  const { key: _key, keyEncrypted, ...safe } = record;
  return {
    ...safe,
    maskedKey: maskKey(keyEncrypted),
  };
}

export async function listInboundKeys() {
  const keys = await prisma.inboundAPIKey.findMany({
    include: {
      permissions: { select: { enabled: true } },
      _count: { select: { usageLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return keys.map((k) => ({
    id: k.id,
    name: k.name,
    maskedKey: maskKey(k.keyEncrypted),
    enabled: k.enabled,
    description: k.description,
    routingStrategy: k.routingStrategy,
    modelCount: k.permissions.filter((p) => p.enabled).length,
    rateLimitRPM: k.rateLimitRPM,
    rateLimitTPM: k.rateLimitTPM,
    dailyLimit: k.dailyLimit,
    monthlyLimit: k.monthlyLimit,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
    requestCount: k._count.usageLogs,
  }));
}

export async function createInboundKey(data: {
  name: string;
  description?: string;
  routingStrategy?: string;
  models?: string[];
  rateLimitRPM?: number | null;
  rateLimitTPM?: number | null;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
}) {
  const plain = newInboundKey();
  const record = await prisma.inboundAPIKey.create({
    data: {
      name: data.name,
      key: hashApiKey(plain),
      keyEncrypted: encryptSecret(plain),
      description: data.description ?? null,
      routingStrategy: (data.routingStrategy ?? "fixed") as never,
      rateLimitRPM: data.rateLimitRPM ?? null,
      rateLimitTPM: data.rateLimitTPM ?? null,
      dailyLimit: data.dailyLimit ?? null,
      monthlyLimit: data.monthlyLimit ?? null,
      ...(data.models?.length
        ? {
            permissions: {
              create: data.models.map((providerModelId, i) => ({
                providerModelId,
                enabled: true,
                priority: i,
                weight: 1,
              })),
            },
          }
        : {}),
    },
  });
  return { id: record.id, key: plain };
}

export async function rotateInboundKey(id: string) {
  const plain = newInboundKey();
  const record = await prisma.inboundAPIKey.update({
    where: { id },
    data: {
      key: hashApiKey(plain),
      keyEncrypted: encryptSecret(plain),
    },
  });
  return { id: record.id, key: plain };
}

export async function updateInboundKey(
  id: string,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    routingStrategy?: string;
    rateLimitRPM?: number | null;
    rateLimitTPM?: number | null;
    dailyLimit?: number | null;
    monthlyLimit?: number | null;
  }
) {
  return prisma.inboundAPIKey.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      routingStrategy: data.routingStrategy as never,
      rateLimitRPM: data.rateLimitRPM === undefined ? undefined : data.rateLimitRPM,
      rateLimitTPM: data.rateLimitTPM === undefined ? undefined : data.rateLimitTPM,
      dailyLimit: data.dailyLimit === undefined ? undefined : data.dailyLimit,
      monthlyLimit: data.monthlyLimit === undefined ? undefined : data.monthlyLimit,
    },
  });
}

export async function setInboundKeyEnabled(id: string, enabled: boolean) {
  return prisma.inboundAPIKey.update({ where: { id }, data: { enabled } });
}

export async function deleteInboundKey(id: string) {
  return prisma.inboundAPIKey.delete({ where: { id } });
}

export async function setModelPermission(data: {
  apiKeyId: string;
  providerModelId: string;
  enabled?: boolean;
  priority?: number;
  weight?: number;
  rateLimitRPM?: number | null;
  rateLimitTPM?: number | null;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
}) {
  const existing = await prisma.inboundModelPermission.findUnique({
    where: {
      apiKeyId_providerModelId: {
        apiKeyId: data.apiKeyId,
        providerModelId: data.providerModelId,
      },
    },
  });
  if (existing) {
    return prisma.inboundModelPermission.update({
      where: { id: existing.id },
      data: {
        enabled: data.enabled,
        priority: data.priority,
        weight: data.weight,
        rateLimitRPM: data.rateLimitRPM === undefined ? undefined : data.rateLimitRPM,
        rateLimitTPM: data.rateLimitTPM === undefined ? undefined : data.rateLimitTPM,
        dailyLimit: data.dailyLimit === undefined ? undefined : data.dailyLimit,
        monthlyLimit: data.monthlyLimit === undefined ? undefined : data.monthlyLimit,
      },
    });
  }
  return prisma.inboundModelPermission.create({
    data: {
      apiKeyId: data.apiKeyId,
      providerModelId: data.providerModelId,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
      weight: data.weight ?? 1,
      rateLimitRPM: data.rateLimitRPM ?? null,
      rateLimitTPM: data.rateLimitTPM ?? null,
      dailyLimit: data.dailyLimit ?? null,
      monthlyLimit: data.monthlyLimit ?? null,
    },
  });
}

export async function removeModelPermission(apiKeyId: string, providerModelId: string) {
  const existing = await prisma.inboundModelPermission.findUnique({
    where: {
      apiKeyId_providerModelId: { apiKeyId, providerModelId },
    },
  });
  if (existing) {
    await prisma.inboundModelPermission.delete({ where: { id: existing.id } });
  }
}

export async function canUseModel(
  apiKeyId: string,
  permissions: Array<{ providerModelId: string; enabled: boolean }>,
  providerModelId: string
): Promise<boolean> {
  if (permissions.length === 0) return true;
  const perm = permissions.find((p) => p.providerModelId === providerModelId);
  return Boolean(perm?.enabled);
}

export async function decryptProviderKey(encrypted: string): Promise<string> {
  return decryptSecret(encrypted);
}
