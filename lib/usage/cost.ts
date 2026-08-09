// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
/**
 * Rough cost estimation using per-1M-token USD prices.
 * Prices are approximations to be refined by the operator.
 */
export interface ModelPrice {
  input: number;
  output: number;
}

const PRICES: Record<string, ModelPrice> = {
  "openai:gpt-5": { input: 1.25, output: 10 },
  "openai:gpt-5-mini": { input: 0.25, output: 2 },
  "openai:gpt-4o": { input: 2.5, output: 10 },
  "openai:gpt-4o-mini": { input: 0.15, output: 0.6 },
  "openai:gpt-4.1": { input: 2, output: 8 },
  "openai:gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "openai:o3": { input: 2, output: 8 },
  "openai:o4-mini": { input: 1.1, output: 4.4 },
  "openai:text-embedding-3-large": { input: 0.13, output: 0 },
  "openai:text-embedding-3-small": { input: 0.02, output: 0 },
  "openai:dall-e-3": { input: 0.04, output: 0 },
  "openai:gpt-image-1": { input: 0.09, output: 0 },
  "anthropic:claude-opus-4": { input: 15, output: 75 },
  "anthropic:claude-sonnet-4": { input: 3, output: 15 },
  "anthropic:claude-haiku-4.5": { input: 1, output: 5 },
  "anthropic:claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "gemini:gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini:gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini:gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini:gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "openrouter:default": { input: 1, output: 3 },
  "groq:llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "groq:llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "alibaba:qwen-max": { input: 0.0024, output: 0.0096 },
  "alibaba:qwen-plus": { input: 0.0008, output: 0.002 },
  "alibaba:qwen-turbo": { input: 0.0003, output: 0.0006 },
};

function matchPrice(providerType: string, modelId: string): ModelPrice | null {
  const exact = PRICES[`${providerType}:${modelId}`];
  if (exact) return exact;
  const best = Object.entries(PRICES)
    .filter(([k]) => k.startsWith(`${providerType}:`))
    .sort((a, b) => b[0].length - a[0].length)
    .find(([k]) => modelId.startsWith(k.split(":")[1]));
  return best ? best[1] : null;
}

export function estimateCost(
  providerType: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const price = matchPrice(providerType, modelId);
  if (!price) return 0;
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
