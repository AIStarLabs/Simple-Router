// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { getPreset } from "@/lib/providers/presets";
import { getAdapter } from "@/lib/providers/registry";
import { splitThinkingBlocks } from "@/lib/providers/thinking";
import type { ProviderType } from "@prisma/client";

export async function listProviders() {
  return prisma.provider.findMany({
    include: {
      _count: { select: { models: true, apiKeys: true, usageLogs: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getProvider(id: string) {
  const provider = await prisma.provider.findUnique({
    where: { id },
    include: {
      apiKeys: { orderBy: { priority: "asc" } },
      models: { include: { _count: { select: { permissions: true } } } },
      _count: { select: { usageLogs: true } },
    },
  });
  if (!provider) return null;
  return {
    ...provider,
    apiKeys: provider.apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      organization: k.organization,
      priority: k.priority,
      enabled: k.enabled,
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    })),
  };
}

export async function createProvider(data: {
  name: string;
  type: ProviderType;
  baseUrl: string;
  authType: "bearer" | "none";
  enabled?: boolean;
  seedModels?: boolean;
}) {
  const preset = getPreset(data.type);
  const baseUrl = data.baseUrl || preset?.baseUrl || "";
  const authType = data.authType || preset?.authType || "bearer";

  const provider = await prisma.provider.create({
    data: {
      name: data.name,
      type: data.type,
      baseUrl,
      authType,
      enabled: data.enabled ?? true,
    },
  });

  if (data.seedModels !== false && preset) {
    await prisma.providerModel.createMany({
      data: preset.models.map((m) => ({
        providerId: provider.id,
        modelId: m.modelId,
        displayName: m.displayName,
        maxContext: m.maxContext ?? null,
        supportsVision: m.supportsVision ?? false,
        supportsImage: m.supportsImage ?? false,
        supportsReasoning: m.supportsReasoning ?? false,
      })),
    });
  }

  return provider;
}

export async function updateProvider(
  id: string,
  data: Partial<{
    name: string;
    baseUrl: string;
    authType: "bearer" | "none";
    enabled: boolean;
  }>
) {
  return prisma.provider.update({ where: { id }, data });
}

export async function deleteProvider(id: string) {
  return prisma.provider.delete({ where: { id } });
}

export async function addProviderKey(
  providerId: string,
  data: {
    name: string;
    apiKey: string;
    organization?: string | null;
    priority?: number;
    enabled?: boolean;
  }
) {
  return prisma.providerAPIKey.create({
    data: {
      providerId,
      name: data.name,
      apiKey: encryptSecret(data.apiKey.trim()),
      organization: data.organization ?? null,
      priority: data.priority ?? 0,
      enabled: data.enabled ?? true,
    },
  });
}

export async function updateProviderKey(
  keyId: string,
  data: Partial<{
    name: string;
    apiKey: string;
    organization: string | null;
    priority: number;
    enabled: boolean;
  }>
) {
  return prisma.providerAPIKey.update({
    where: { id: keyId },
    data: {
      name: data.name,
      apiKey: data.apiKey ? encryptSecret(data.apiKey.trim()) : undefined,
      organization: data.organization,
      priority: data.priority,
      enabled: data.enabled,
    },
  });
}

export async function deleteProviderKey(keyId: string) {
  return prisma.providerAPIKey.delete({ where: { id: keyId } });
}

export async function seedPresetModels(providerId: string) {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return 0;
  const preset = getPreset(provider.type);
  if (!preset) return 0;
  let count = 0;
  for (const m of preset.models) {
    const existing = await prisma.providerModel.findUnique({
      where: { providerId_modelId: { providerId, modelId: m.modelId } },
    });
    if (existing) continue;
    await prisma.providerModel.create({
      data: {
        providerId,
        modelId: m.modelId,
        displayName: m.displayName,
        maxContext: m.maxContext ?? null,
        supportsVision: m.supportsVision ?? false,
        supportsImage: m.supportsImage ?? false,
        supportsReasoning: m.supportsReasoning ?? false,
      },
    });
    count++;
  }
  return count;
}

export async function testProviderConnection(providerId: string, keyId?: string) {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { apiKeys: true },
  });
  if (!provider) throw new Error("Provider not found");

  const key = keyId
    ? provider.apiKeys.find((k) => k.id === keyId)
    : provider.apiKeys.find((k) => k.enabled);
  if (!key) throw new Error("No API key configured for this provider");

  const AdapterCtor = getAdapter(provider.type);
  if (!AdapterCtor) throw new Error(`No adapter for provider type ${provider.type}`);
  const adapter = new AdapterCtor({ baseUrl: provider.baseUrl });

  const { decryptSecret } = await import("@/lib/crypto");
  return adapter.health!({
    apiKeyId: null,
    inboundKeyName: "admin-test",
    provider: {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      baseUrl: provider.baseUrl,
      authType: provider.authType,
    },
    providerKey: {
      id: key.id,
      apiKey: decryptSecret(key.apiKey),
      organization: key.organization,
      priority: key.priority,
      enabled: key.enabled,
    },
  });
}

const TEST_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Request timed out after ${ms / 1000}s`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

export async function testModelWithKey(params: {
  modelId: string;
  apiKey: string;
  prompt: string;
  systemPrompt?: string;
}) {
  const providerModel = await prisma.providerModel.findUnique({
    where: { id: params.modelId },
    include: { provider: true },
  });
  if (!providerModel) throw new Error("Model not found");

  const provider = providerModel.provider;
  const AdapterCtor = getAdapter(provider.type);
  if (!AdapterCtor) throw new Error(`No adapter for provider type ${provider.type}`);
  const adapter = new AdapterCtor({ baseUrl: provider.baseUrl });

  const result = await withTimeout(
    adapter.chat(
      {
        model: providerModel.modelId,
        messages: [
          ...(params.systemPrompt
            ? [{ role: "system" as const, content: params.systemPrompt }]
            : []),
          { role: "user" as const, content: params.prompt },
        ],
      },
      {
        apiKeyId: null,
        inboundKeyName: "admin-test",
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          authType: provider.authType,
        },
        providerKey: {
          id: "manual-test",
          apiKey: params.apiKey.trim(),
          organization: null,
          priority: 0,
          enabled: true,
        },
      }
    ),
    TEST_TIMEOUT_MS
  );

  if (!result.response.ok) {
    const body = result.errorBody as
      | { error?: { message?: string }; message?: string }
      | string
      | null
      | undefined;
    const message =
      typeof body === "string"
        ? body
        : body?.error?.message ?? body?.message ?? `Provider returned HTTP ${result.response.status}`;
    throw new Error(message || `Provider returned HTTP ${result.response.status}`);
  }

  const json = (await result.response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
        reasoning_content?: unknown;
        reasoning?: unknown;
      };
    }>;
  };
  const message = json.choices?.[0]?.message;
  const content = message?.content;
  const text = typeof content === "string" ? content : JSON.stringify(content ?? "");
  const thinkingRaw = message?.reasoning_content ?? message?.reasoning;
  const thinkingField =
    typeof thinkingRaw === "string" ? thinkingRaw : thinkingRaw ? JSON.stringify(thinkingRaw) : "";

  // Separate thinking that arrived inside the content (e.g. <thought>…</thought>).
  const parsedContent = splitThinkingBlocks(text);
  const parsedThinkingField = splitThinkingBlocks(thinkingField);
  const thinking = [parsedThinkingField.thinking, parsedContent.thinking]
    .filter(Boolean)
    .join("\n\n");

  return {
    content: parsedContent.content,
    thinking,
    model: result.model ?? providerModel.modelId,
  };
}
