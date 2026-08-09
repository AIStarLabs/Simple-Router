// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect } from "vitest";
import {
  inboundKeyUpdateSchema,
  providerUpdateSchema,
  providerKeySchema,
  permissionSchema,
} from "@/lib/validation/schemas";

describe("update schemas must not inject create-time defaults", () => {
  it("inbound key update does not reset routingStrategy", () => {
    const r = inboundKeyUpdateSchema.safeParse({ enabled: false });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.enabled).toBe(false);
      expect("routingStrategy" in r.data).toBe(false);
    }
  });

  it("provider update does not reset authType", () => {
    const r = providerUpdateSchema.safeParse({ enabled: false });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("authType" in r.data).toBe(false);
    }
  });

  it("provider key update does not reset priority", () => {
    const r = providerKeySchema.partial().safeParse({ enabled: false });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("priority" in r.data).toBe(false);
    }
  });

  it("permission update does not reset priority/weight/enabled", () => {
    const r = permissionSchema.safeParse({
      providerModelId: "m1",
      rateLimitRPM: 10,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("enabled" in r.data).toBe(false);
      expect("priority" in r.data).toBe(false);
      expect("weight" in r.data).toBe(false);
      expect(r.data.rateLimitRPM).toBe(10);
    }
  });
});
