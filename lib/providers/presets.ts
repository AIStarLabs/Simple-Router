// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import type {
  ProviderPreset,
  ProviderPresetModel,
} from "@/lib/providers/types";

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    authType: "bearer",
    models: [
      m("gpt-5", "GPT-5", { maxContext: 400000, supportsReasoning: true }),
      m("gpt-5-mini", "GPT-5 Mini", { maxContext: 400000, supportsReasoning: true }),
      m("gpt-4o", "GPT-4o", { maxContext: 128000, supportsVision: true }),
      m("gpt-4o-mini", "GPT-4o Mini", { maxContext: 128000, supportsVision: true }),
      m("gpt-4.1", "GPT-4.1", { maxContext: 1047576, supportsVision: true }),
      m("gpt-4.1-mini", "GPT-4.1 Mini", { maxContext: 1047576, supportsVision: true }),
      m("o3", "o3", { maxContext: 200000, supportsReasoning: true }),
      m("o4-mini", "o4-mini", { maxContext: 200000, supportsReasoning: true }),
      m("text-embedding-3-large", "Text Embedding 3 Large", { maxContext: 8191 }),
      m("text-embedding-3-small", "Text Embedding 3 Small", { maxContext: 8191 }),
      m("dall-e-3", "DALL-E 3", { supportsImage: true }),
      m("gpt-image-1", "GPT Image 1", { supportsImage: true }),
    ],
  },
  {
    type: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    authType: "bearer",
    models: [
      m("gemini-2.5-pro", "Gemini 2.5 Pro", { maxContext: 1048576, supportsVision: true, supportsReasoning: true }),
      m("gemini-2.5-flash", "Gemini 2.5 Flash", { maxContext: 1048576, supportsVision: true, supportsReasoning: true }),
      m("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", { maxContext: 1048576, supportsVision: true }),
      m("gemini-2.0-flash", "Gemini 2.0 Flash", { maxContext: 1048576, supportsVision: true }),
      m("gemini-2.0-flash-lite", "Gemini 2.0 Flash Lite", { maxContext: 1048576, supportsVision: true }),
      m("gemini-embedding-001", "Gemini Embedding", { maxContext: 2048 }),
    ],
  },
  {
    type: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "bearer",
    models: [
      m("claude-opus-4-20250514", "Claude Opus 4", { maxContext: 200000, supportsVision: true, supportsReasoning: true }),
      m("claude-sonnet-4-20250514", "Claude Sonnet 4", { maxContext: 200000, supportsVision: true, supportsReasoning: true }),
      m("claude-haiku-4-5-20251001", "Claude Haiku 4.5", { maxContext: 200000, supportsVision: true }),
      m("claude-3-5-sonnet-20241022", "Claude 3.5 Sonnet", { maxContext: 200000, supportsVision: true }),
    ],
  },
  {
    type: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    authType: "bearer",
    models: [
      m("llama-3.3-70b-versatile", "Llama 3.3 70B Versatile", { maxContext: 131072 }),
      m("llama-3.1-8b-instant", "Llama 3.1 8B Instant", { maxContext: 131072 }),
      m("llama-3.2-3b-preview", "Llama 3.2 3B Preview", { maxContext: 131072 }),
      m("llama-3.2-1b-preview", "Llama 3.2 1B Preview", { maxContext: 131072 }),
      m("mixtral-8x7b-32768", "Mixtral 8x7B", { maxContext: 32768 }),
      m("gemma2-9b-it", "Gemma 2 9B", { maxContext: 8192 }),
    ],
  },
  {
    type: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    authType: "bearer",
    models: [
      m("openai/gpt-5", "GPT-5", { supportsReasoning: true }),
      m("anthropic/claude-sonnet-4", "Claude Sonnet 4", { supportsVision: true }),
      m("google/gemini-2.5-pro", "Gemini 2.5 Pro", { supportsVision: true }),
      m("meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B", { maxContext: 131072 }),
    ],
  },
  {
    type: "alibaba",
    name: "Alibaba Cloud DashScope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authType: "bearer",
    models: [
      m("qwen-max", "Qwen Max", { maxContext: 32768, supportsReasoning: true }),
      m("qwen-plus", "Qwen Plus", { maxContext: 131072 }),
      m("qwen-turbo", "Qwen Turbo", { maxContext: 1000000 }),
      m("qwen2.5-72b-instruct", "Qwen 2.5 72B Instruct", { maxContext: 131072 }),
      m("qwen-vl-max", "Qwen VL Max", { maxContext: 32768, supportsVision: true }),
      m("qwen-image", "Qwen Image", { supportsImage: true }),
      m("wan2.1-t2i-turbo", "Wan 2.1 T2I Turbo", { supportsImage: true }),
      m("text-embedding-v3", "Text Embedding V3", { maxContext: 8192 }),
    ],
  },
  {
    type: "local",
    name: "Local OpenAI Compatible",
    baseUrl: "http://localhost:11434/v1",
    authType: "bearer",
    models: [
      m("qwen2.5:7b", "Qwen 2.5 7B", { maxContext: 32768 }),
      m("llama3.2:latest", "Llama 3.2", { maxContext: 131072 }),
    ],
  },
];

function m(
  modelId: string,
  displayName: string,
  opts?: Partial<ProviderPresetModel>
): ProviderPresetModel {
  return { modelId, displayName, ...opts };
}

export function getPreset(type: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.type === type);
}
