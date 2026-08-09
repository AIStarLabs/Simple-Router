// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect } from "vitest";
import { splitThinkingBlocks } from "@/lib/providers/thinking";

describe("splitThinkingBlocks", () => {
  it("extracts <thought> blocks and keeps the rest", () => {
    const { content, thinking } = splitThinkingBlocks(
      "<thought>Let me weigh the options carefully.</thought>\n\nHere is the **answer**."
    );
    expect(content).toBe("Here is the **answer**.");
    expect(thinking).toContain("Let me weigh the options carefully.");
  });

  it("extracts <thinking> and <reasoning> tags too", () => {
    const { content, thinking } = splitThinkingBlocks(
      "<thinking>Step one.</thinking>\n<reasoning>Because of X.</reasoning>\nResult."
    );
    expect(content).toBe("Result.");
    expect(thinking).toContain("Step one.");
    expect(thinking).toContain("Because of X.");
  });

  it("handles multiple and nested-ish blocks, stripping leftover tags", () => {
    const { content, thinking } = splitThinkingBlocks(
      "<thinking>a</thinking>b<thought>c</thought>"
    );
    expect(content).toBe("b");
    expect(thinking).toContain("a");
    expect(thinking).toContain("c");
  });

  it("extracts Qwen-style <|thinking_start|> tokens", () => {
    const { content, thinking } = splitThinkingBlocks(
      "<|thinking_start|>Plan the approach.<|thinking_end|>Final answer here."
    );
    expect(content).toBe("Final answer here.");
    expect(thinking).toContain("Plan the approach.");
  });

  it("returns content unchanged when no thinking tags", () => {
    const text = "Just a normal answer with **markdown**.";
    const { content, thinking } = splitThinkingBlocks(text);
    expect(content).toBe(text);
    expect(thinking).toBe("");
  });

  it("returns empty result for empty input", () => {
    expect(splitThinkingBlocks("")).toEqual({ content: "", thinking: "" });
  });
});
