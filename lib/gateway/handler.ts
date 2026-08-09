// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { apiError, unauthorized, notFound, rateLimited } from "@/lib/api";
import { authenticateInboundKey, ApiKeyError } from "@/lib/services/api-keys";
import { resolveTargets, ModelNotFoundError } from "@/lib/routing/resolve";
import { checkRateLimits } from "@/lib/rate-limit/limiter";
import { execute, type GatewayMethod } from "@/lib/gateway/execute";
import { logUsage, estimatePromptTokens } from "@/lib/usage/service";
import { interceptStreamForUsage } from "@/lib/usage/stream-usage";
import type { UsageStatus } from "@prisma/client";

export interface ParsedGatewayRequest {
  model: string;
  stream?: boolean;
  messages?: unknown;
  tools?: unknown;
}

export interface GatewayHandlerOptions {
  method: GatewayMethod;
  endpoint: string;
  parse: (body: unknown) => ParsedGatewayRequest;
  runRateLimits?: boolean;
}

export async function handleGatewayRequest(
  req: Request,
  opts: GatewayHandlerOptions
): Promise<Response> {
  const start = Date.now();
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    await logUsage({
      status: "authError",
      endpoint: opts.endpoint,
      error: "Missing bearer token",
    });
    return unauthorized("Missing bearer token");
  }

  let apiKey: Awaited<ReturnType<typeof authenticateInboundKey>>;
  try {
    apiKey = await authenticateInboundKey(token);
  } catch (e) {
    const err = e as ApiKeyError;
    await logUsage({
      status: "authError",
      endpoint: opts.endpoint,
      error: err.message,
    });
    return unauthorized(err.message);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "Invalid JSON body", "invalid_request_error");
  }

  let parsed: ParsedGatewayRequest;
  try {
    parsed = opts.parse(body);
  } catch (e) {
    const message = (e as Error).message ?? "Invalid request";
    await logUsage({
      apiKeyId: apiKey.id,
      status: "error",
      endpoint: opts.endpoint,
      error: message,
    });
    return apiError(400, message, "invalid_request_error");
  }

  let resolved: Awaited<ReturnType<typeof resolveTargets>>;
  try {
    resolved = await resolveTargets({
      model: parsed.model,
      apiKey,
    });
  } catch (e) {
    if (e instanceof ModelNotFoundError) {
      await logUsage({
        apiKeyId: apiKey.id,
        status: "notFound",
        endpoint: opts.endpoint,
        model: parsed.model,
        error: e.message,
      });
      return notFound(e.message);
    }
    return apiError(500, (e as Error).message ?? "Resolution failed");
  }

  const promptTokens = estimatePromptTokens(
    (parsed.messages as Parameters<typeof estimatePromptTokens>[0]) ?? [],
    parsed.tools
  );

  if (opts.runRateLimits !== false) {
    const modelRules = resolved.providerModelIds
      .map((pmid) => {
        const perm = apiKey.permissions.find((p) => p.providerModelId === pmid);
        if (!perm) return null;
        return {
          scope: pmid,
          rpm: perm.rateLimitRPM,
          tpm: perm.rateLimitTPM,
        };
      })
      .filter((r): r is { scope: string; rpm: number | null; tpm: number | null } => r !== null);

    const rateResult = await checkRateLimits({
      apiKeyId: apiKey.id,
      apiKeyRpm: apiKey.rateLimitRPM,
      apiKeyTpm: apiKey.rateLimitTPM,
      dailyLimit: apiKey.dailyLimit,
      monthlyLimit: apiKey.monthlyLimit,
      modelRules,
      promptTokens,
    });

    if (!rateResult.allowed) {
      await logUsage({
        apiKeyId: apiKey.id,
        status: "rateLimited",
        endpoint: opts.endpoint,
        model: parsed.model,
        error: rateResult.message,
      });
      return rateLimited(rateResult.message ?? "Rate limit exceeded");
    }
  }

  // If chat streaming, request upstream to include usage in the final SSE chunk.
  if (opts.method === "chat" && parsed.stream && !(body as Record<string, unknown>).stream_options) {
    (body as Record<string, unknown>).stream_options = { include_usage: true };
  }

  const result = await execute(resolved.targets, {
    method: opts.method,
    request: body as Record<string, unknown>,
    inbound: { apiKeyId: apiKey.id, inboundKeyName: apiKey.name },
  });

  const latency = Date.now() - start;
  const status: UsageStatus = result.ok ? "success" : "error";
  const stream = Boolean(parsed.stream);

  if (!result.ok) {
    await logUsage({
      apiKeyId: apiKey.id,
      providerId: result.providerId,
      providerModelId: result.providerModelId,
      endpoint: opts.endpoint,
      model: result.model ?? parsed.model,
      requestTokens: promptTokens,
      responseTokens: result.usage?.completionTokens ?? 0,
      cost: undefined,
      latency,
      stream,
      status,
      error: result.error,
    });
    return apiError(502, result.error ?? "Upstream provider error", "upstream_error");
  }

  // Streaming: wrap the response so usage is captured when the stream finishes.
  if (stream) {
    const usageEntry = {
      apiKeyId: apiKey.id,
      providerId: result.providerId,
      providerModelId: result.providerModelId,
      endpoint: opts.endpoint,
      model: result.model ?? parsed.model,
      requestTokens: promptTokens,
      cost: undefined,
      latency,
      stream: true,
      status: "success" as UsageStatus,
      error: null as null,
    };
    return interceptStreamForUsage(result.response as Response, async (completionTokens) => {
      await logUsage({ ...usageEntry, responseTokens: completionTokens });
    });
  }

  // Non-stream: log usage now and return the response.
  await logUsage({
    apiKeyId: apiKey.id,
    providerId: result.providerId,
    providerModelId: result.providerModelId,
    endpoint: opts.endpoint,
    model: result.model ?? parsed.model,
    requestTokens: promptTokens,
    responseTokens: result.usage?.completionTokens ?? 0,
    cost: undefined,
    latency,
    stream: false,
    status,
    error: null,
  });

  return result.response as Response;
}
