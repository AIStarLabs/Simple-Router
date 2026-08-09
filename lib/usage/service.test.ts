// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect } from "vitest";
import { estimatePromptTokens, estimateTextTokens } from "@/lib/usage/service";
import { estimateCost } from "@/lib/usage/cost";
import type { ChatMessage } from "@/lib/providers/types";

describe("token estimation", () => {
  it("estimates ~1 token per 4 chars", () => {
    expect(estimateTextTokens("hello world")).toBeGreaterThan(1);
    expect(estimateTextTokens("")).toBe(0);
    expect(estimateTextTokens("")).toBe(0);
  });

  it("estimates prompt tokens for messages", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello there" },
    ];
    const tokens = estimatePromptTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });

  it("counts image parts as extra tokens", () => {
    const textOnly = estimatePromptTokens([{ role: "user", content: "describe this" }]);
    const withImage = estimatePromptTokens([
      {
        role: "user",
        content: [
          { type: "text", text: "describe this" },
          { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
        ],
      },
    ]);
    expect(withImage).toBeGreaterThan(textOnly);
  });
});

describe("cost estimation", () => {
  it("computes cost from per-token price", () => {
    const cost = estimateCost("openai", "gpt-4o", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(2.5 + 10, 4);
  });

  it("returns 0 for unknown models", () => {
    expect(estimateCost("openai", "some-unknown-model", 100, 100)).toBe(0);
  });
});
