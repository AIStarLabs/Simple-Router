// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import type { ProviderType, AuthType } from "@prisma/client";

export interface ChatMessage {
  role: string;
  content: string | unknown;
  name?: string;
  tool_calls?: unknown;
  tool_call_id?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  tools?: unknown;
  tool_choice?: unknown;
  response_format?: unknown;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  user?: string;
  stream_options?: unknown;
  n?: number;
  logprobs?: boolean;
  [key: string]: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface ProviderRequestContext {
  apiKeyId: string | null;
  inboundKeyName: string;
  provider: ProviderRow;
  providerKey: ProviderKeyRow;
}

export interface ProviderRow {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  authType: AuthType;
}

export interface ProviderKeyRow {
  id: string;
  apiKey: string;
  organization?: string | null;
  priority: number;
  enabled: boolean;
}

export interface ProviderCallResult {
  /** The raw upstream response, passed through to the client. */
  response: Response;
  /** Extracted usage for non-streaming responses. */
  usage: TokenUsage | null;
  /** Resolved upstream model id (may differ from request model). */
  model: string | null;
  /** Parsed JSON body for error responses. */
  errorBody: unknown | null;
}

export interface ProviderHealthResult {
  ok: boolean;
  status?: number;
  latency?: number;
  message?: string;
  models?: unknown;
}

export interface AIProvider {
  readonly type: string;
  chat(
    request: ChatCompletionRequest,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult>;
  responses?(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult>;
  embeddings?(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult>;
  images?(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult>;
  models?(
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<unknown>;
  health?(ctx: ProviderRequestContext, signal?: AbortSignal): Promise<ProviderHealthResult>;
}

export interface ProviderPresetModel {
  modelId: string;
  displayName?: string;
  supportsVision?: boolean;
  supportsImage?: boolean;
  supportsReasoning?: boolean;
  supportsVietnamese?: boolean;
  bestTaskTags?: string[];
  maxContext?: number;
}

export interface ProviderPreset {
  type: ProviderType;
  name: string;
  baseUrl: string;
  authType: AuthType;
  models: ProviderPresetModel[];
}

export interface OpenAIErrorBody {
  error: {
    message: string;
    type?: string;
    param?: unknown;
    code?: string;
  };
}

export function openAIError(message: string, code = "invalid_request_error"): OpenAIErrorBody {
  return { error: { message, type: code, param: null, code } };
}

/** bestTaskTags is stored in the database as a JSON-encoded string. */
export function serializeTags(tags: string[] | undefined | null): string {
  return JSON.stringify(tags ?? []);
}

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}
