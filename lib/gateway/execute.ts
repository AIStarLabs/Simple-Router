// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { getAdapter } from "@/lib/providers/registry";
import type {
  ChatCompletionRequest,
  ProviderCallResult,
  ProviderRequestContext,
  TokenUsage,
} from "@/lib/providers/types";
import type { ExecutionTarget } from "@/lib/routing/resolve";

export type GatewayMethod = "chat" | "responses" | "embeddings" | "images";

export interface ExecuteOptions {
  method: GatewayMethod;
  request: Record<string, unknown>;
  inbound: { apiKeyId: string | null; inboundKeyName: string };
  timeoutMs?: number;
}

export interface ExecuteResult {
  ok: boolean;
  response: Response | null;
  usage: TokenUsage | null;
  model: string | null;
  providerId: string | null;
  providerModelId: string | null;
  error: string | null;
  attempts: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const IMAGE_TIMEOUT_MS = 300_000;

function formatProviderError(res: Response, errorBody: unknown): string {
  if (errorBody && typeof errorBody === "object") {
    const e = errorBody as {
      error?: { message?: string };
      message?: string;
    };
    if (e.error?.message) return e.error.message;
    if (e.message) return e.message;
  }
  if (errorBody && typeof errorBody === "string" && errorBody) return errorBody;
  return `Provider returned status ${res.status} ${res.statusText}`;
}

export async function execute(
  targets: ExecutionTarget[],
  options: ExecuteOptions
): Promise<ExecuteResult> {
  const timeoutMs =
    options.timeoutMs ??
    (options.method === "images" ? IMAGE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);
  let lastError: string | null = null;
  let attempts = 0;

  for (const target of targets) {
    if (target.providerKeys.length === 0) {
      lastError = `Provider '${target.provider.name}' has no enabled API keys`;
      continue;
    }

    for (const key of target.providerKeys) {
      attempts++;
      const ctx: ProviderRequestContext = {
        apiKeyId: options.inbound.apiKeyId,
        inboundKeyName: options.inbound.inboundKeyName,
        provider: {
          id: target.provider.id,
          name: target.provider.name,
          type: target.provider.type as ProviderRequestContext["provider"]["type"],
          baseUrl: target.provider.baseUrl,
          authType: target.provider.authType as ProviderRequestContext["provider"]["authType"],
        },
        providerKey: {
          id: key.id,
          apiKey: key.apiKey,
          organization: key.organization,
          priority: key.priority,
          enabled: key.enabled,
        },
      };

      const AdapterCtor = getAdapter(target.provider.type);
      if (!AdapterCtor) {
        lastError = `No adapter registered for provider type '${target.provider.type}'`;
        continue;
      }
      const adapter = new AdapterCtor({ baseUrl: target.provider.baseUrl });
      const methodFn = adapter[options.method];
      if (!methodFn) {
        lastError = `Provider '${target.provider.name}' does not support ${options.method}`;
        continue;
      }

      const body = { ...options.request, model: target.providerModel.modelId } as ChatCompletionRequest;

      let result: ProviderCallResult;
      try {
        result = await withTimeout(
          methodFn.call(adapter, body, ctx),
          timeoutMs
        );
      } catch (e) {
        lastError = (e as Error).message ?? String(e);
        continue;
      }

      if (result.response.ok) {
        return {
          ok: true,
          response: result.response,
          usage: result.usage,
          model: result.model ?? target.providerModel.modelId,
          providerId: target.provider.id,
          providerModelId: target.providerModel.id,
          error: null,
          attempts,
        };
      }
      lastError = formatProviderError(result.response, result.errorBody);
    }
  }

  return {
    ok: false,
    response: null,
    usage: null,
    model: null,
    providerId: null,
    providerModelId: null,
    error: lastError ?? "All providers failed",
    attempts,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Upstream timeout after ${ms}ms`)), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}
