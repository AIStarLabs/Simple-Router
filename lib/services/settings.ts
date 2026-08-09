// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import { generateApiKey, encryptSecret } from "@/lib/crypto";
import { hashApiKey } from "@/lib/services/api-keys";

export async function getSettings() {
  const [jwt, encryption, redis] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "jwt_secret_set" } }),
    prisma.setting.findUnique({ where: { key: "encryption_key_set" } }),
    prisma.setting.findUnique({ where: { key: "redis_url" } }),
  ]);

  return {
    jwtSecretConfigured: Boolean(process.env.JWT_SECRET) || Boolean(jwt?.value),
    jwtSecretCustom: Boolean(jwt?.value),
    encryptionKeyConfigured: Boolean(process.env.ENCRYPTION_KEY) || Boolean(encryption?.value),
    encryptionKeyCustom: Boolean(encryption?.value),
    redisUrl: redis?.value ?? "",
    redisConfigured: Boolean(redis?.value),
  };
}

export async function updateSettings(data: { redisUrl?: string }) {
  if (data.redisUrl !== undefined) {
    await prisma.setting.upsert({
      where: { key: "redis_url" },
      update: { value: data.redisUrl },
      create: { key: "redis_url", value: data.redisUrl },
    });
  }
  return getSettings();
}

export interface ExportConfig {
  version: 1;
  providers: Array<{
    name: string;
    type: string;
    baseUrl: string;
    authType: string;
    enabled: boolean;
    models: Array<{
      modelId: string;
      displayName?: string | null;
      enabled: boolean;
      maxContext?: number | null;
      supportsVision?: boolean;
      supportsImage?: boolean;
      supportsReasoning?: boolean;
    }>;
  }>;
  inboundKeys: Array<{
    name: string;
    description?: string | null;
    enabled: boolean;
    routingStrategy: string;
    models: Array<{
      provider: string;
      model: string;
      priority?: number;
      weight?: number;
      rateLimitRPM?: number | null;
      rateLimitTPM?: number | null;
    }>;
  }>;
}

export async function exportConfig(): Promise<ExportConfig> {
  const providers = await prisma.provider.findMany({
    include: { models: true },
    orderBy: { createdAt: "asc" },
  });
  const inboundKeys = await prisma.inboundAPIKey.findMany({
    include: { permissions: { include: { providerModel: { include: { provider: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    version: 1,
    providers: providers.map((p) => ({
      name: p.name,
      type: p.type,
      baseUrl: p.baseUrl,
      authType: p.authType,
      enabled: p.enabled,
      models: p.models.map((m) => ({
        modelId: m.modelId,
        displayName: m.displayName,
        enabled: m.enabled,
        maxContext: m.maxContext,
        supportsVision: m.supportsVision,
        supportsImage: m.supportsImage,
        supportsReasoning: m.supportsReasoning,
      })),
    })),
    inboundKeys: inboundKeys.map((k) => ({
      name: k.name,
      description: k.description,
      enabled: k.enabled,
      routingStrategy: k.routingStrategy,
      models: k.permissions.map((p) => ({
        provider: p.providerModel.provider.name,
        model: p.providerModel.modelId,
        priority: p.priority,
        weight: p.weight,
        rateLimitRPM: p.rateLimitRPM,
        rateLimitTPM: p.rateLimitTPM,
      })),
    })),
  };
}

export async function importConfig(data: ExportConfig) {
  const providerIdByName = new Map<string, string>();
  const modelIdByKey = new Map<string, string>();

  for (const p of data.providers ?? []) {
    const existing = await prisma.provider.findUnique({ where: { name: p.name } });
    const provider = existing
      ? await prisma.provider.update({
          where: { id: existing.id },
          data: {
            type: p.type as never,
            baseUrl: p.baseUrl,
            authType: p.authType as never,
            enabled: p.enabled,
          },
        })
      : await prisma.provider.create({
          data: {
            name: p.name,
            type: p.type as never,
            baseUrl: p.baseUrl,
            authType: p.authType as never,
            enabled: p.enabled,
          },
        });
    providerIdByName.set(p.name, provider.id);
    for (const m of p.models ?? []) {
      const model = await prisma.providerModel.upsert({
        where: {
          providerId_modelId: { providerId: provider.id, modelId: m.modelId },
        },
        update: {
          displayName: m.displayName,
          enabled: m.enabled,
          maxContext: m.maxContext,
          supportsVision: m.supportsVision ?? false,
          supportsImage: m.supportsImage ?? false,
          supportsReasoning: m.supportsReasoning ?? false,
        },
        create: {
          providerId: provider.id,
          modelId: m.modelId,
          displayName: m.displayName,
          enabled: m.enabled,
          maxContext: m.maxContext,
          supportsVision: m.supportsVision ?? false,
          supportsImage: m.supportsImage ?? false,
          supportsReasoning: m.supportsReasoning ?? false,
        },
      });
      modelIdByKey.set(`${p.name}:${m.modelId}`, model.id);
    }
  }

  for (const k of data.inboundKeys ?? []) {
    const existing = await prisma.inboundAPIKey.findFirst({
      where: { name: k.name },
    });
    if (!existing) {
      const plain = generateApiKey();
      await prisma.inboundAPIKey.create({
        data: {
          name: k.name,
          description: k.description,
          enabled: k.enabled,
          routingStrategy: k.routingStrategy as never,
          key: hashApiKey(plain),
          keyEncrypted: encryptSecret(plain),
        },
      });
    } else {
      await prisma.inboundAPIKey.update({
        where: { id: existing.id },
        data: {
          description: k.description,
          enabled: k.enabled,
          routingStrategy: k.routingStrategy as never,
        },
      });
    }

    // Upsert model grants (routing targets + rate limits) by provider/model name.
    const keyId = (await prisma.inboundAPIKey.findFirst({
      where: { name: k.name },
      select: { id: true },
    }))?.id;
    if (!keyId) continue;
    for (const m of k.models ?? []) {
      const providerModelId = modelIdByKey.get(`${m.provider}:${m.model}`);
      if (!providerModelId) continue;
      const perm = await prisma.inboundModelPermission.findUnique({
        where: {
          apiKeyId_providerModelId: { apiKeyId: keyId, providerModelId },
        },
      });
      if (perm) {
        await prisma.inboundModelPermission.update({
          where: { id: perm.id },
          data: {
            enabled: true,
            priority: m.priority ?? 0,
            weight: m.weight ?? 1,
            rateLimitRPM: m.rateLimitRPM ?? null,
            rateLimitTPM: m.rateLimitTPM ?? null,
          },
        });
      } else {
        await prisma.inboundModelPermission.create({
          data: {
            apiKeyId: keyId,
            providerModelId,
            enabled: true,
            priority: m.priority ?? 0,
            weight: m.weight ?? 1,
            rateLimitRPM: m.rateLimitRPM ?? null,
            rateLimitTPM: m.rateLimitTPM ?? null,
          },
        });
      }
    }
  }

  return { imported: true };
}
