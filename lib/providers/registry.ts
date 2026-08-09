// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import type { AIProvider } from "@/lib/providers/types";
import type { ProviderType } from "@prisma/client";
import { OpenAIProvider } from "@/lib/providers/adapters/openai";
import { GeminiProvider } from "@/lib/providers/adapters/gemini";
import { AnthropicProvider } from "@/lib/providers/adapters/anthropic";
import { GroqProvider } from "@/lib/providers/adapters/groq";
import { OpenRouterProvider } from "@/lib/providers/adapters/openrouter";
import { AlibabaProvider } from "@/lib/providers/adapters/alibaba";
import { LocalProvider } from "@/lib/providers/adapters/local";

export type AdapterConstructor = new (opts: { baseUrl: string }) => AIProvider;

const registry = new Map<string, AdapterConstructor>([
  ["openai", OpenAIProvider],
  ["gemini", GeminiProvider],
  ["anthropic", AnthropicProvider],
  ["groq", GroqProvider],
  ["openrouter", OpenRouterProvider],
  ["alibaba", AlibabaProvider],
  ["local", LocalProvider],
]);

export function getAdapter(type: string): AdapterConstructor | undefined {
  return registry.get(type);
}

export function hasAdapter(type: string): boolean {
  return registry.has(type);
}

export function registerAdapter(
  type: ProviderType | string,
  ctor: AdapterConstructor
): void {
  registry.set(type, ctor);
}

export function listAdapters(): string[] {
  return [...registry.keys()];
}
