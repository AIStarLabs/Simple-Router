// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect, beforeAll } from "vitest";
import { hashApiKey, canUseModel } from "@/lib/services/api-keys";
import { signSession, verifySession, signApiToken, verifyApiToken } from "@/lib/auth/jwt";

beforeAll(() => {
  process.env.JWT_SECRET = "test-jwt-secret-1234567890";
});

describe("api-keys helpers", () => {
  it("hashes api keys deterministically", () => {
    const key = "sk-sr-abc123";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
    expect(hashApiKey(key)).toHaveLength(64);
    expect(hashApiKey(key)).not.toBe(key);
  });

  it("allows all models when no permissions are set", async () => {
    expect(await canUseModel("key1", [], "model-1")).toBe(true);
  });

  it("allows only explicitly granted models when permissions exist", async () => {
    const permissions = [
      { providerModelId: "model-1", enabled: true },
      { providerModelId: "model-2", enabled: false },
    ];
    expect(await canUseModel("key1", permissions, "model-1")).toBe(true);
    expect(await canUseModel("key1", permissions, "model-2")).toBe(false);
    expect(await canUseModel("key1", permissions, "model-3")).toBe(false);
  });
});

describe("auth jwt", () => {
  it("roundtrips a session token", async () => {
    const token = await signSession({ userId: "u1", role: "admin", email: "a@b" });
    const payload = await verifySession(token);
    expect(payload?.userId).toBe("u1");
    expect(payload?.role).toBe("admin");
  });

  it("rejects invalid tokens", async () => {
    expect(await verifySession("garbage.token.here")).toBeNull();
  });

  it("roundtrips an api token", async () => {
    const token = await signApiToken({ sub: "k1", apiKeyId: "k1", name: "Project", type: "inbound" });
    const payload = await verifyApiToken(token);
    expect(payload?.apiKeyId).toBe("k1");
    expect(payload?.name).toBe("Project");
  });
});
