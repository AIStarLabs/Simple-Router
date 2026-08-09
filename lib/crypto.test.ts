// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, generateApiKey, generateRandomToken } from "@/lib/crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, "x").toString("base64");
});

describe("crypto", () => {
  it("roundtrips encrypt -> decrypt", () => {
    const plain = "sk-test-1234567890";
    const encrypted = encryptSecret(plain);
    expect(encrypted).not.toBe(plain);
    expect(decryptSecret(encrypted)).toBe(plain);
  });

  it("produces unique ciphertexts for the same input (random IV)", () => {
    const a = encryptSecret("same-value");
    const b = encryptSecret("same-value");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("same-value");
    expect(decryptSecret(b)).toBe("same-value");
  });

  it("throws on tampered payloads", () => {
    const encrypted = encryptSecret("hello");
    const tampered = encrypted.slice(0, -2) + "zz";
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("generates prefixed api keys and random tokens", () => {
    expect(generateApiKey()).toMatch(/^sk-sr-[a-f0-9]{48}$/);
    expect(generateRandomToken(16)).toHaveLength(32);
  });
});
