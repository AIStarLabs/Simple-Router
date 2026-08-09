// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
const THINKING_TAG = "(?:thought|thinking|reasoning|analysis)";

const OPEN_TAG_RE = new RegExp(`<${THINKING_TAG}\\b[^>]*>`, "gi");
const CLOSE_TAG_RE = new RegExp(`</${THINKING_TAG}\\b[^>]*>`, "gi");
const BLOCK_RE = new RegExp(`<${THINKING_TAG}\\b[^>]*>([\\s\\S]*?)</${THINKING_TAG}\\b[^>]*>`, "gi");

export interface SplitOutput {
  /** Main answer with thinking blocks removed. */
  content: string;
  /** Extracted thinking/reasoning text. */
  thinking: string;
}

/**
 * Splits model output into main content and thinking text.
 *
 * Handles:
 * - paired tags: `<thought>`, `<thinking>`, `<reasoning>`, `<analysis>`
 * - Qwen-style tokens: `<|thinking_start|>…<|thinking_end|>`
 */
export function splitThinkingBlocks(text: string): SplitOutput {
  if (!text) return { content: "", thinking: "" };

  const thinking: string[] = [];

  // Paired tag blocks.
  let remaining = text.replace(BLOCK_RE, (_match, inner: string) => {
    const value = String(inner).trim();
    if (value) thinking.push(value);
    return "";
  });
  // Any leftover unmatched open/close tags.
  remaining = remaining.replace(CLOSE_TAG_RE, "").replace(OPEN_TAG_RE, "");

  // Qwen-style thinking tokens.
  const qwenMatches = text.match(/<\|thinking_start\|>([\s\S]*?)<\|thinking_end\|>/gi);
  for (const match of qwenMatches ?? []) {
    const value = match
      .replace(/<\|thinking_start\|>/gi, "")
      .replace(/<\|thinking_end\|>/gi, "")
      .trim();
    if (value) thinking.push(value);
  }
  remaining = remaining
    .replace(/<\|thinking_start\|>[\s\S]*?<\|thinking_end\|>/gi, "")
    .replace(/<\|thinking_start\|>/gi, "")
    .replace(/<\|thinking_end\|>/gi, "");

  return {
    content: remaining.trim(),
    thinking: thinking.filter(Boolean).join("\n\n"),
  };
}
