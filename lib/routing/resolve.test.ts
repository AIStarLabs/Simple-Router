// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    provider: { findUnique: vi.fn() },
    providerModel: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    providerAPIKey: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decryptSecret: (s: string) => s,
}));

import { prisma } from "@/lib/db";
import { resolveTargets, ModelNotFoundError } from "@/lib/routing/resolve";

const provider = {
  id: "p1",
  name: "Provider One",
  type: "openai",
  baseUrl: "https://api.example.com/v1",
  authType: "bearer",
  enabled: true,
};
const providerModel = { id: "m1", modelId: "gpt-4o", providerId: "p1" };

beforeEach(() => {
  vi.mocked(prisma.provider.findUnique).mockResolvedValue(provider as never);
  vi.mocked(prisma.providerModel.findUnique).mockResolvedValue(providerModel as never);
  vi.mocked(prisma.providerModel.findFirst).mockResolvedValue({
    ...providerModel,
    provider,
  } as never);
  vi.mocked(prisma.providerModel.findMany).mockResolvedValue([
    { ...providerModel, provider },
  ] as never);
  vi.mocked(prisma.providerAPIKey.findMany).mockResolvedValue([
    { id: "k1", apiKey: "encrypted-key", organization: null, priority: 0, enabled: true },
  ] as never);
});

const restrictedKey = {
  id: "key-1",
  name: "Development",
  routingStrategy: "weighted" as const,
  permissions: [
    {
      providerModelId: "m1",
      enabled: true,
      priority: 0,
      weight: 1,
      providerModel: { id: "m1", modelId: "gpt-4o", enabled: true, provider },
    },
  ],
};

const allowAllKey = {
  id: "key-2",
  name: "Open",
  routingStrategy: "fixed" as const,
  permissions: [],
};

describe("resolveTargets", () => {
  it("routes a direct provider model the key is permitted to use", async () => {
    const res = await resolveTargets({ model: "gpt-4o", apiKey: restrictedKey });
    expect(res.providerModelIds).toEqual(["m1"]);
    expect(res.targets[0].provider.name).toBe("Provider One");
    expect(res.targets[0].providerKeys[0].apiKey).toBe("encrypted-key");
  });

  it("routes via the key's virtual model name using its strategy", async () => {
    const res = await resolveTargets({ model: "Development", apiKey: restrictedKey });
    expect(res.providerModelIds).toEqual(["m1"]);
  });

  it("rejects a provider model not granted to a restricted key", async () => {
    await expect(
      resolveTargets({ model: "gpt-5", apiKey: restrictedKey })
    ).rejects.toBeInstanceOf(ModelNotFoundError);
  });

  it("allow-all keys can reference any enabled model", async () => {
    const res = await resolveTargets({ model: "gpt-4o", apiKey: allowAllKey });
    expect(res.providerModelIds).toEqual(["m1"]);
  });

  it("allow-all keys route their virtual model across all enabled models", async () => {
    vi.mocked(prisma.providerModel.findFirst).mockResolvedValue(null as never);
    const res = await resolveTargets({ model: "Open", apiKey: allowAllKey });
    expect(res.providerModelIds).toEqual(["m1"]);
    expect(prisma.providerModel.findMany).toHaveBeenCalled();
  });

  it("throws for an unknown model on an allow-all key", async () => {
    vi.mocked(prisma.providerModel.findFirst).mockResolvedValue(null as never);
    await expect(
      resolveTargets({ model: "nope", apiKey: allowAllKey })
    ).rejects.toBeInstanceOf(ModelNotFoundError);
  });
});
