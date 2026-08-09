// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { z } from "zod";

const chatMessage = z.object({
  role: z.string().min(1),
  content: z
    .union([z.string(), z.null(), z.array(z.record(z.string(), z.any()))])
    .optional(),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
  tool_calls: z.any().optional(),
});

export const chatCompletionSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessage).min(1),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().int().nonnegative().optional(),
  max_completion_tokens: z.number().int().nonnegative().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.any().optional(),
  tool_choice: z.any().optional(),
  response_format: z.any().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  seed: z.number().optional(),
  user: z.string().optional(),
  stream_options: z.any().optional(),
  n: z.number().int().optional(),
  logprobs: z.boolean().optional(),
  top_logprobs: z.number().optional(),
  parallel_tool_calls: z.any().optional(),
});

export const responsesSchema = z.object({
  model: z.string().min(1),
  input: z.any(),
  stream: z.boolean().optional(),
  instructions: z.string().optional(),
  max_output_tokens: z.number().optional(),
  temperature: z.number().optional(),
  tools: z.any().optional(),
});

export const embeddingsSchema = z.object({
  model: z.string().min(1),
  input: z.any(),
  encoding_format: z.string().optional(),
  dimensions: z.number().int().optional(),
  user: z.string().optional(),
});

export const imagesSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  n: z.number().int().optional(),
  size: z.string().optional(),
  quality: z.string().optional(),
  response_format: z.string().optional(),
  style: z.string().optional(),
  user: z.string().optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(3)
    .refine((v) => v.includes("@"), { message: "Invalid email address" }),
  password: z.string().min(1),
});

export const inboundKeyCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  routingStrategy: z
    .enum(["fixed", "random", "roundRobin", "weighted", "priorityFailover"])
    .default("fixed"),
  models: z.array(z.string().min(1)).optional(),
  rateLimitRPM: z.number().int().nullable().optional(),
  rateLimitTPM: z.number().int().nullable().optional(),
  dailyLimit: z.number().int().nullable().optional(),
  monthlyLimit: z.number().int().nullable().optional(),
});

export const inboundKeyUpdateSchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    enabled: z.boolean(),
    routingStrategy: z.enum([
      "fixed",
      "random",
      "roundRobin",
      "weighted",
      "priorityFailover",
    ]),
    models: z.array(z.string().min(1)),
    rateLimitRPM: z.number().int().nullable(),
    rateLimitTPM: z.number().int().nullable(),
    dailyLimit: z.number().int().nullable(),
    monthlyLimit: z.number().int().nullable(),
  })
  .partial();

export const providerCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    "openai",
    "gemini",
    "anthropic",
    "groq",
    "openrouter",
    "alibaba",
    "local",
  ]),
  baseUrl: z.string().url().or(z.string().min(1)),
  authType: z.enum(["bearer", "none"]).default("bearer"),
  enabled: z.boolean().default(true),
});

export const providerUpdateSchema = z
  .object({
    name: z.string().min(1),
    type: z.enum([
      "openai",
      "gemini",
      "anthropic",
      "groq",
      "openrouter",
      "alibaba",
      "local",
    ]),
    baseUrl: z.string().url().or(z.string().min(1)),
    authType: z.enum(["bearer", "none"]),
    enabled: z.boolean(),
  })
  .partial();

export const providerKeySchema = z.object({
  name: z.string().min(1),
  apiKey: z.string().min(1),
  organization: z.string().optional().nullable(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export const providerModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().optional(),
  enabled: z.boolean().default(true),
  maxContext: z.number().int().nullable().optional(),
  supportsVision: z.boolean().default(false),
  supportsImage: z.boolean().default(false),
  supportsReasoning: z.boolean().default(false),
  metadata: z.string().optional(),
});

export const permissionSchema = z.object({
  providerModelId: z.string().min(1),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  weight: z.number().int().min(1).optional(),
  rateLimitRPM: z.number().int().nullable().optional(),
  rateLimitTPM: z.number().int().nullable().optional(),
  dailyLimit: z.number().int().nullable().optional(),
  monthlyLimit: z.number().int().nullable().optional(),
});

export const testModelSchema = z.object({
  modelId: z.string().min(1),
  apiKey: z.string().optional().default(""),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
});
