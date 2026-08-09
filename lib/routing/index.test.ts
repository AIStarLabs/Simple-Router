// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect } from "vitest";
import { buildCandidateOrder, formatRoutingStrategy, type MappingCandidate } from "@/lib/routing";

const candidates: MappingCandidate[] = [
  { providerModelId: "a", priority: 0, weight: 1, providerId: "p1", providerName: "P1", providerType: "openai", modelId: "gpt-4o" },
  { providerModelId: "b", priority: 1, weight: 3, providerId: "p2", providerName: "P2", providerType: "groq", modelId: "llama" },
  { providerModelId: "c", priority: 2, weight: 6, providerId: "p3", providerName: "P3", providerType: "gemini", modelId: "flash" },
];

describe("buildCandidateOrder", () => {
  it("fixed returns only the first mapping", () => {
    const order = buildCandidateOrder("fixed", candidates);
    expect(order).toHaveLength(1);
    expect(order[0].providerModelId).toBe("a");
  });

  it("returns empty for no mappings", () => {
    expect(buildCandidateOrder("fixed", [])).toHaveLength(0);
  });

  it("random returns a single candidate that exists in the set", () => {
    for (let i = 0; i < 50; i++) {
      const order = buildCandidateOrder("random", candidates);
      expect(order).toHaveLength(1);
      expect(candidates.map((c) => c.providerModelId)).toContain(order[0].providerModelId);
    }
  });

  it("roundRobin rotates through all candidates", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 9; i++) {
      const order = buildCandidateOrder("roundRobin", candidates, "rr-1");
      seen.add(order[0].providerModelId);
    }
    expect(seen.size).toBe(3);
  });

  it("weighted always picks a valid candidate", () => {
    for (let i = 0; i < 100; i++) {
      const order = buildCandidateOrder("weighted", candidates);
      expect(candidates.map((c) => c.providerModelId)).toContain(order[0].providerModelId);
    }
  });

  it("priorityFailover sorts ascending by priority", () => {
    const order = buildCandidateOrder("priorityFailover", candidates);
    expect(order.map((c) => c.providerModelId)).toEqual(["a", "b", "c"]);
  });
});

describe("formatRoutingStrategy", () => {
  it("maps all strategies to labels", () => {
    expect(formatRoutingStrategy("fixed")).toBe("Fixed");
    expect(formatRoutingStrategy("random")).toBe("Random");
    expect(formatRoutingStrategy("roundRobin")).toBe("Round Robin");
    expect(formatRoutingStrategy("weighted")).toBe("Weighted Random");
    expect(formatRoutingStrategy("priorityFailover")).toBe("Priority Failover");
  });
});
