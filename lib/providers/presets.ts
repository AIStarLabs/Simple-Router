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
      // m("gpt-5", "GPT-5", { maxContext: 400000, supportsReasoning: true }),
    ],
  },
  {
    type: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    authType: "bearer",
    models: [
      m("gemini-embedding-001", "Gemini Embedding 1", { maxContext: 3072, supportsVietnamese: true, bestTaskTags: ["embeddings", "retrieval"] }),
      m("gemini-embedding-2-preview", "Gemini Embedding 2", { maxContext: 3072, supportsVietnamese: true, bestTaskTags: ["embeddings", "retrieval"] }),
      m("google/gemma-4-26B-A4B-it", "Google Gemma 4 26B A4B It", { maxContext: 256000, supportsReasoning: true, supportsVietnamese: true, bestTaskTags: ["code", "natural language"] }),
      m("google/gemma-4-31B-it", "Google Gemma 4 31B It", { maxContext: 256000, supportsReasoning: true, supportsVietnamese: true, bestTaskTags: ["code", "natural language"] }),
    ],
  },
  {
    type: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "bearer",
    models: [
      // m("claude-opus-4-20250514", "Claude Opus 4", { maxContext: 200000, supportsVision: true, supportsReasoning: true }),
    ],
  },
  {
    type: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    authType: "bearer",
    models: [
      // m("llama-3.3-70b-versatile", "Llama 3.3 70B Versatile", { maxContext: 131072 }),
    ],
  },
  {
    type: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    authType: "bearer",
    models: [
      m("inclusionai/ling-3.0-flash-fin:free", "Ling 3.0 Flash Fin", { maxContext: 262000, bestTaskTags: ["natural language", "fast"] }),
      m("dots-studio/dots-3-note-preview:free", "Dots3-Note Preview", { maxContext: 512000, supportsVision: true, supportsReasoning: true, supportsVietnamese: true, bestTaskTags: ["vision", "natural language"] }),
      m("liquid/lfm-2.5-2.6b:free", "LFM2.5-2.6B", { maxContext: 66000, supportsReasoning: true, bestTaskTags: ["reasoning", "natural language"] }),
      m("nvidia/nemotron-3.5-lightning:free", "NVIDIA: Nemotron 3.5 Lightning", { maxContext: 1000000, supportsReasoning: true, bestTaskTags: ["code", "agentic"] }),
      m("poolside/laguna-s-2.1:free", "Poolside: Laguna S 2.1", { maxContext: 262000, supportsReasoning: true, supportsVietnamese: false, bestTaskTags: ["code"] }), // not good at Vietnamese
      m("poolside/laguna-xs-2.1:free", "Poolside: Laguna XS 2.1", { maxContext: 262000, supportsReasoning: true, supportsVietnamese: false, bestTaskTags: ["code"] }),
      m("cohere/north-mini-code:free", "Cohere: North Mini Code", { maxContext: 256000, supportsReasoning: false, bestTaskTags: ["code"] }),
    ],
  },
  {
    type: "alibaba",
    name: "Alibaba Cloud DashScope",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authType: "bearer",
    models: [
      // m("qwen-max", "Qwen Max", { maxContext: 32768, supportsReasoning: true }),
    ],
  },
  {
    type: "local",
    name: "Local OpenAI Compatible",
    baseUrl: "http://localhost:11434/v1",
    authType: "bearer",
    models: [
      // m("qwen2.5:7b", "Qwen 2.5 7B", { maxContext: 32768 }),
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
