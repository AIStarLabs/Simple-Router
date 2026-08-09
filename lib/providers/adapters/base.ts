// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import type {
  AIProvider,
  ChatCompletionRequest,
  ProviderCallResult,
  ProviderRequestContext,
  TokenUsage,
} from "@/lib/providers/types";

export interface OpenAICompatConfig {
  type: string;
  baseUrl: string;
  orgHeader?: boolean;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly type: string;

  constructor(protected config: OpenAICompatConfig) {
    this.type = config.type;
  }

  protected headers(
    ctx: ProviderRequestContext,
    extra?: Record<string, string>
  ): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      ...extra,
    };
    if (ctx.provider.authType === "bearer" && ctx.providerKey.apiKey) {
      h["Authorization"] = `Bearer ${ctx.providerKey.apiKey}`;
    }
    if (ctx.providerKey.organization && this.config.orgHeader) {
      h["OpenAI-Organization"] = ctx.providerKey.organization;
    }
    return h;
  }

  protected post(
    path: string,
    body: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.config.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(ctx),
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  }

  async chat(
    request: ChatCompletionRequest,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult> {
    const res = await this.post("/chat/completions", request, ctx, signal);
    return normalizeOpenAIResponse(res, Boolean(request.stream));
  }

  async responses(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult> {
    const res = await this.post("/responses", request, ctx, signal);
    return normalizeOpenAIResponse(res, Boolean((request as { stream?: boolean }).stream));
  }

  async embeddings(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult> {
    const res = await this.post("/embeddings", request, ctx, signal);
    return normalizeOpenAIResponse(res, false);
  }

  async images(
    request: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult> {
    const res = await this.post("/images/generations", request, ctx, signal);
    return normalizeOpenAIResponse(res, false);
  }

  async models(ctx: ProviderRequestContext, signal?: AbortSignal): Promise<unknown> {
    const res = await fetch(`${this.config.baseUrl}/models`, {
      headers: this.headers(ctx),
      signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    try {
      const json = await res.json();
      return json?.data ?? [];
    } catch {
      return [];
    }
  }

  async health(
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<{ ok: boolean; status?: number; latency?: number; message?: string; models?: unknown }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.config.baseUrl}/models`, {
        headers: this.headers(ctx),
        signal,
        cache: "no-store",
      });
      const latency = Date.now() - start;
      if (!res.ok) {
        return { ok: false, status: res.status, latency, message: await safeText(res) };
      }
      const json = (await res.json()) as { data?: unknown };
      return { ok: true, status: res.status, latency, models: json.data ?? [] };
    } catch (e) {
      return { ok: false, latency: Date.now() - start, message: (e as Error).message };
    }
  }
}

export async function normalizeOpenAIResponse(
  res: Response,
  stream: boolean
): Promise<ProviderCallResult> {
  let usage: TokenUsage | null = null;
  let model: string | null = null;
  let errorBody: unknown = null;

  if (!res.ok) {
    const clone = res.clone();
    errorBody = await safeJsonOrText(clone);
  } else if (!stream) {
    const clone = res.clone();
    try {
      const json = (await clone.json()) as {
        usage?: unknown;
        model?: string;
      };
      usage = extractOpenAIUsage(json.usage);
      model = json.model ?? null;
    } catch {
      // non-json body (e.g. images) - ignore
    }
  }

  return { response: res, usage, model, errorBody };
}

export function extractOpenAIUsage(u: unknown): TokenUsage | null {
  if (!u || typeof u !== "object") return null;
  const rec = u as Record<string, unknown>;
  const promptTokens =
    (rec.prompt_tokens as number) ??
    (rec.input_tokens as number) ??
    (rec.promptTokens as number) ??
    0;
  const completionTokens =
    (rec.completion_tokens as number) ??
    (rec.output_tokens as number) ??
    (rec.completionTokens as number) ??
    0;
  return { promptTokens: Number(promptTokens) || 0, completionTokens: Number(completionTokens) || 0 };
}

async function safeJsonOrText(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return await res.text();
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
