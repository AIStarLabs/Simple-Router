// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import type {
  AIProvider,
  ChatCompletionRequest,
  ProviderCallResult,
  ProviderRequestContext,
  TokenUsage,
} from "@/lib/providers/types";

const ANTHROPIC_VERSION = "2023-06-01";

type AnthMessage = {
  role: "user" | "assistant";
  content: unknown;
};

interface AnthRequestBody {
  model: string;
  messages: AnthMessage[];
  max_tokens: number;
  system?: string;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
}

export class AnthropicProvider implements AIProvider {
  readonly type = "anthropic";

  constructor(private opts: { baseUrl: string }) {}

  private headers(ctx: ProviderRequestContext): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
    };
    if (ctx.providerKey.apiKey) h["x-api-key"] = ctx.providerKey.apiKey;
    if (ctx.providerKey.organization) h["anthropic-organization"] = ctx.providerKey.organization;
    return h;
  }

  private post(
    body: unknown,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<Response> {
    return fetch(`${this.opts.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(ctx),
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  }

  private buildRequest(request: ChatCompletionRequest): AnthRequestBody {
    const messages: AnthMessage[] = [];
    let system = "";

    for (const msg of request.messages) {
      if (msg.role === "system") {
        const text =
          typeof msg.content === "string" ? msg.content : extractTextFromContent(msg.content);
        if (text) system += (system ? "\n" : "") + text;
        continue;
      }

      // OpenAI tool result → Anthropic tool_result block (keeps tool_use_id linkage).
      if (msg.role === "tool") {
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id ?? "",
              content: convertContent(msg.content),
            },
          ],
        });
        continue;
      }

      const role: "user" | "assistant" =
        msg.role === "assistant" ? "assistant" : "user";
      const converted = convertContent(msg.content);
      const blocks: unknown[] =
        typeof converted === "string"
          ? converted
            ? [{ type: "text", text: converted }]
            : []
          : (converted as unknown[]);

      // OpenAI assistant tool_calls → Anthropic tool_use blocks.
      if (msg.role === "assistant" && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          const t = tc as {
            id?: string;
            type?: string;
            function?: { name?: string; arguments?: unknown };
          };
          if (!t.function?.name) continue;
          blocks.push({
            type: "tool_use",
            id: t.id ?? `toolu_${cryptoId()}`,
            name: t.function.name,
            input: parseJsonSafe(t.function.arguments),
          });
        }
      }

      if (blocks.length > 0) {
        messages.push({ role, content: blocks });
      }
    }

    const max_tokens = request.max_tokens ?? request.max_completion_tokens ?? 4096;
    const body: AnthRequestBody = { model: request.model, messages, max_tokens };

    if (system) body.system = system;
    if (request.temperature != null) body.temperature = request.temperature;
    if (request.top_p != null) body.top_p = request.top_p;
    if (request.stop) {
      body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }
    if (request.stream) body.stream = true;
    if (request.tools) body.tools = convertTools(request.tools);
    if (request.tool_choice) body.tool_choice = convertToolChoice(request.tool_choice);

    return body;
  }

  async chat(
    request: ChatCompletionRequest,
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<ProviderCallResult> {
    const anthBody = this.buildRequest(request);
    const res = await this.post(anthBody, ctx, signal);
    const stream = Boolean(request.stream);

    if (!res.ok) {
      const clone = res.clone();
      let errorBody: unknown;
      try {
        errorBody = await clone.json();
      } catch {
        errorBody = await clone.text();
      }
      return { response: res, usage: null, model: null, errorBody };
    }

    if (!stream) {
      const clone = res.clone();
      let json: unknown = null;
      try {
        json = await clone.json();
      } catch {
        /* ignore */
      }
      const usage = extractAnthUsage(json);
      const model = (json as { model?: string } | null)?.model ?? null;
      const converted = toOpenAIChatCompletion(json, request.model);
      return {
        response: new Response(JSON.stringify(converted), {
          status: res.status,
          headers: {
            "Content-Type": "application/json",
            ...stripHopHeaders(res.headers),
          },
        }),
        usage,
        model,
        errorBody: null,
      };
    }

    // Streaming: convert Anthropic SSE events to OpenAI SSE chunks.
    const meta = {
      id: cryptoId(),
      model: request.model,
      created: Math.floor(Date.now() / 1000),
    };
    const transform = convertAnthropicStream(meta);
    const convertedBody = res.body?.pipeThrough(transform) ?? transform.readable;
    return {
      response: new Response(convertedBody, {
        status: res.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }),
      usage: null,
      model: request.model,
      errorBody: null,
    };
  }

  async responses(
    _request?: unknown,
    _ctx?: ProviderRequestContext
  ): Promise<ProviderCallResult> {
    return unsupported("Anthropic does not expose an OpenAI /responses endpoint");
  }

  async embeddings(
    _request?: unknown,
    _ctx?: ProviderRequestContext
  ): Promise<ProviderCallResult> {
    return unsupported("Anthropic does not expose an embeddings endpoint");
  }

  async images(
    _request?: unknown,
    _ctx?: ProviderRequestContext
  ): Promise<ProviderCallResult> {
    return unsupported("Anthropic does not expose an image generation endpoint");
  }

  async models(ctx: ProviderRequestContext, signal?: AbortSignal): Promise<unknown> {
    const res = await fetch(`${this.opts.baseUrl}/models`, {
      headers: { ...this.headers(ctx) },
      signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    try {
      const json = (await res.json()) as { data?: unknown };
      return json.data ?? [];
    } catch {
      return [];
    }
  }

  async health(
    ctx: ProviderRequestContext,
    signal?: AbortSignal
  ): Promise<{ ok: boolean; status?: number; latency?: number; message?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.opts.baseUrl}/models`, {
        headers: { ...this.headers(ctx) },
        signal,
        cache: "no-store",
      });
      const latency = Date.now() - start;
      return {
        ok: res.ok,
        status: res.status,
        latency,
        message: res.ok ? undefined : (await safeText(res)).slice(0, 500),
      };
    } catch (e) {
      return { ok: false, latency: Date.now() - start, message: (e as Error).message };
    }
  }
}

/* ------------------------------ conversion ------------------------------ */

function convertContent(content: unknown): unknown {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part: Record<string, unknown>) => {
    if (part.type === "text") {
      return { type: "text", text: String(part.text ?? "") };
    }
    if (part.type === "image_url" || part.type === "input_image") {
      const url = String((part as Record<string, Record<string, unknown>>).image_url?.url ?? "");
      return { type: "image", source: imageSource(url) };
    }
    if (part.type === "image") {
      const src = part.source as Record<string, unknown>;
      return { type: "image", source: src };
    }
    if (part.type === "tool_call" || part.type === "function_call") {
      return { type: "tool_use", id: String(part.id ?? ""), name: String(part.name ?? ""), input: part.input ?? part.arguments ?? {} };
    }
    if (part.type === "tool_result") {
      const contentStr =
        typeof part.content === "string" ? part.content : JSON.stringify(part.content);
      return {
        type: "tool_result",
        tool_use_id: String(part.tool_call_id ?? ""),
        content: contentStr,
      };
    }
    if (part.type === "text_delta") {
      return { type: "text", text: String(part.text ?? "") };
    }
    return { type: "text", text: JSON.stringify(part) };
  });
}

function imageSource(url: string): Record<string, unknown> {
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;,]+);base64,([\s\S]*)$/);
    if (m) return { type: "base64", media_type: m[1], data: m[2] };
    return { type: "base64", media_type: "image/png", data: url };
  }
  return { type: "url", url };
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p: Record<string, unknown>) => (p.type === "text" ? String(p.text ?? "") : ""))
      .join("");
  }
  return "";
}

function parseJsonSafe(input: unknown): unknown {
  if (typeof input !== "string") return input ?? {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function convertTools(tools: unknown): unknown[] {
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => {
    const f = t as { type?: string; function?: { name?: string; description?: string; parameters?: unknown } };
    if (f.type === "function") {
      return {
        name: f.function?.name,
        description: f.function?.description,
        input_schema: f.function?.parameters ?? { type: "object", properties: {} },
      };
    }
    return t;
  });
}

function convertToolChoice(choice: unknown): unknown {
  if (typeof choice === "string") {
    if (choice === "auto") return { type: "auto" };
    if (choice === "none") return { type: "none" };
    return { type: "auto" };
  }
  const c = choice as { type?: string; function?: { name?: string } };
  if (c?.type === "function" && c.function?.name) {
    return { type: "tool", name: c.function.name };
  }
  return { type: "auto" };
}

function toOpenAIChatCompletion(anth: unknown, fallbackModel: string): Record<string, unknown> {
  const a = (anth ?? {}) as {
    id?: string;
    model?: string;
    content?: Array<{
      type?: string;
      text?: string;
      name?: string;
      input?: unknown;
      id?: string;
      thinking?: string;
    }>;
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const textParts: string[] = [];
  const thinkingParts: string[] = [];
  const toolCalls: Array<Record<string, unknown>> = [];
  for (const block of a.content ?? []) {
    if (block.type === "text" && block.text) textParts.push(block.text);
    if (block.type === "thinking" && block.thinking) thinkingParts.push(block.thinking);
    if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
      });
    }
  }
  const message: Record<string, unknown> = { role: "assistant" };
  if (textParts.length) message.content = textParts.join("");
  if (thinkingParts.length) message.reasoning_content = thinkingParts.join("\n");
  if (toolCalls.length) message.tool_calls = toolCalls;

  return {
    id: a.id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: a.model ?? fallbackModel,
    choices: [
      {
        index: 0,
        message,
        finish_reason: mapFinishReason(a.stop_reason),
      },
    ],
    usage: {
      prompt_tokens: a.usage?.input_tokens ?? 0,
      completion_tokens: a.usage?.output_tokens ?? 0,
      total_tokens: (a.usage?.input_tokens ?? 0) + (a.usage?.output_tokens ?? 0),
    },
  };
}

function mapFinishReason(stopReason?: string): string {
  switch (stopReason) {
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    case "stop_sequence":
    case "end_turn":
      return "stop";
    default:
      return "stop";
  }
}

function extractAnthUsage(anth: unknown): TokenUsage | null {
  const a = anth as { usage?: { input_tokens?: number; output_tokens?: number } } | null;
  if (!a?.usage) return null;
  return {
    promptTokens: a.usage.input_tokens ?? 0,
    completionTokens: a.usage.output_tokens ?? 0,
  };
}

function unsupported(message: string): ProviderCallResult {
  return {
    response: new Response(
      JSON.stringify({ error: { message, type: "unsupported", param: null, code: "unsupported" } }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    ),
    usage: null,
    model: null,
    errorBody: { error: { message, type: "unsupported", param: null, code: "unsupported" } },
  };
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function stripHopHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (!/^(content-length|connection|transfer-encoding|keep-alive|proxy-)/i.test(key)) {
      out[key] = value;
    }
  });
  return out;
}

function cryptoId(): string {
  return `chatcmpl-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

/* ---------------------------- stream conversion ---------------------------- */

function convertAnthropicStream(
  meta: { id: string; model: string; created: number }
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let started = false;
  const toolCalls = new Map<number, { id?: string; name?: string }>();

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          continue;
        }
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(data) as Record<string, unknown>;
        } catch {
          continue;
        }
        switch (evt.type) {
          case "message_start": {
            const msg = evt.message as { id?: string } | undefined;
            started = true;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  id: msg?.id ?? meta.id,
                  object: "chat.completion.chunk",
                  created: meta.created,
                  model: meta.model,
                  choices: [
                    {
                      index: 0,
                      delta: { role: "assistant", content: "" },
                      finish_reason: null,
                    },
                  ],
                })}\n\n`
              )
            );
            break;
          }
          case "content_block_start": {
            const block = evt.content_block as { type?: string; id?: string; name?: string };
            if (block?.type === "tool_use") {
              const index = Number(evt.index ?? 0);
              toolCalls.set(index, { id: block.id, name: block.name });
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: meta.id,
                    object: "chat.completion.chunk",
                    created: meta.created,
                    model: meta.model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          tool_calls: [
                            {
                              index,
                              id: block.id,
                              type: "function",
                              function: { name: block.name, arguments: "" },
                            },
                          ],
                        },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`
                )
              );
            }
            break;
          }
          case "content_block_delta": {
            const delta = evt.delta as { type?: string; text?: string; partial_json?: string };
            if (delta?.type === "text_delta" && delta.text) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: meta.id,
                    object: "chat.completion.chunk",
                    created: meta.created,
                    model: meta.model,
                    choices: [
                      {
                        index: 0,
                        delta: { content: delta.text },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`
                )
              );
            } else if (delta?.type === "input_json_delta") {
              const index = Number(evt.index ?? 0);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    id: meta.id,
                    object: "chat.completion.chunk",
                    created: meta.created,
                    model: meta.model,
                    choices: [
                      {
                        index: 0,
                        delta: {
                          tool_calls: [
                            {
                              index,
                              function: { arguments: delta.partial_json ?? "" },
                            },
                          ],
                        },
                        finish_reason: null,
                      },
                    ],
                  })}\n\n`
                )
              );
            }
            break;
          }
          case "message_delta": {
            const delta = evt.delta as { stop_reason?: string } | undefined;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  id: meta.id,
                  object: "chat.completion.chunk",
                  created: meta.created,
                  model: meta.model,
                  choices: [
                    { index: 0, delta: {}, finish_reason: mapFinishReason(delta?.stop_reason) ?? "stop" },
                  ],
                })}\n\n`
              )
            );
            break;
          }
          case "error": {
            const err = evt.error as { message?: string } | undefined;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  id: meta.id,
                  object: "chat.completion.chunk",
                  created: meta.created,
                  model: meta.model,
                  choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
                })}\n\n`
              )
            );
            void err;
            break;
          }
          default:
            break;
        }
      }
    },
    flush(controller) {
      void started;
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    },
  });
}
