// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { describe, it, expect, vi, afterEach } from "vitest";
import { AnthropicProvider } from "@/lib/providers/adapters/anthropic";
import type { ProviderRequestContext } from "@/lib/providers/types";

const ctx: ProviderRequestContext = {
  apiKeyId: "key-1",
  inboundKeyName: "test",
  provider: {
    id: "p1",
    name: "Anthropic",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    authType: "bearer",
  },
  providerKey: {
    id: "pk1",
    apiKey: "sk-ant-test",
    organization: null,
    priority: 0,
    enabled: true,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

describe("AnthropicProvider", () => {
  it("converts an OpenAI chat request to the Anthropic Messages API", async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL, init?: RequestInit) => {
        calls.push(init as RequestInit);
        return new Response(
          JSON.stringify({
            id: "msg_1",
            type: "message",
            model: "claude-sonnet-4",
            content: [{ type: "text", text: "Hello from Claude" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 12, output_tokens: 5 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    const result = await provider.chat(
      {
        model: "claude-sonnet-4",
        messages: [
          { role: "system", content: "Be brief" },
          { role: "user", content: "Hi there" },
        ],
      },
      ctx
    );

    expect(result.response.ok).toBe(true);
    expect(result.usage?.promptTokens).toBe(12);
    expect(result.usage?.completionTokens).toBe(5);

    const sent = JSON.parse(String(calls[0].body));
    expect(sent.system).toBe("Be brief");
    expect(sent.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "Hi there" }] },
    ]);
    expect(sent.max_tokens).toBeGreaterThan(0);
    expect(calls[0].headers).toMatchObject({ "x-api-key": "sk-ant-test" });

    const openAI = (await result.response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };
    expect(openAI.choices[0].message.content).toBe("Hello from Claude");
    expect(openAI.choices[0].finish_reason).toBe("stop");
    expect(openAI.usage.prompt_tokens).toBe(12);
  });

  it("propagates upstream error bodies", async () => {
    stubFetch(401, {
      error: { message: "invalid x-api-key", type: "authentication_error" },
    });
    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    const result = await provider.chat(
      { model: "claude-sonnet-4", messages: [{ role: "user", content: "hi" }] },
      ctx
    );
    expect(result.response.ok).toBe(false);
    expect(result.errorBody).toMatchObject({
      error: { message: "invalid x-api-key" },
    });
  });

  it("maps thinking blocks to reasoning_content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "msg_t1",
            type: "message",
            model: "claude-opus-4",
            content: [
              { type: "thinking", thinking: "Let me think about this carefully." },
              { type: "text", text: "Here is the **answer**." },
            ],
            stop_reason: "end_turn",
            usage: { input_tokens: 5, output_tokens: 7 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    const result = await provider.chat(
      { model: "claude-opus-4", messages: [{ role: "user", content: "hi" }] },
      ctx
    );

    const openAI = (await result.response.json()) as {
      choices: Array<{ message: { content?: string; reasoning_content?: string } }>;
    };
    expect(openAI.choices[0].message.content).toBe("Here is the **answer**.");
    expect(openAI.choices[0].message.reasoning_content).toBe(
      "Let me think about this carefully."
    );
  });

  it("converts assistant tool_calls and tool results for Anthropic", async () => {
    const calls: RequestInit[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string | URL, init?: RequestInit) => {
        calls.push(init as RequestInit);
        return new Response(
          JSON.stringify({
            id: "msg_t2",
            type: "message",
            model: "claude-sonnet-4",
            content: [{ type: "text", text: "Done." }],
            stop_reason: "end_turn",
            usage: { input_tokens: 5, output_tokens: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      })
    );

    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    await provider.chat(
      {
        model: "claude-sonnet-4",
        messages: [
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "get_weather", arguments: '{"city":"Paris"}' },
              },
            ],
          },
          { role: "tool", tool_call_id: "call_1", content: "20C" },
          { role: "user", content: "Thanks" },
        ],
      },
      ctx
    );

    const sent = JSON.parse(String(calls[0].body)) as {
      messages: Array<{ role: string; content: unknown[] }>;
    };
    expect(sent.messages).toHaveLength(3);
    expect(sent.messages[0].role).toBe("assistant");
    const assistantContent = sent.messages[0].content as Array<{
      type: string;
      name?: string;
      input?: unknown;
      id?: string;
    }>;
    expect(assistantContent[0]).toMatchObject({
      type: "tool_use",
      id: "call_1",
      name: "get_weather",
      input: { city: "Paris" },
    });
    const toolResult = sent.messages[1].content as Array<{
      type: string;
      tool_use_id: string;
      content: string;
    }>;
    expect(toolResult[0]).toMatchObject({
      type: "tool_result",
      tool_use_id: "call_1",
      content: "20C",
    });
  });

  it("reports unsupported endpoints with 501", async () => {
    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    const result = await provider.embeddings({}, ctx);
    expect(result.response.status).toBe(501);
  });

  it("converts Anthropic SSE to OpenAI streaming chunks", async () => {
    const anthropicSse = [
      `event: message_start\ndata: {"type":"message_start","message":{"id":"msg_s1","role":"assistant"}}\n\n`,
      `event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`,
      `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n`,
      `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n`,
      `event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n`,
      `event: message_stop\ndata: {"type":"message_stop"}\n\n`,
    ].join("");

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(anthropicSse));
        controller.close();
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      )
    );

    const provider = new AnthropicProvider({ baseUrl: "https://api.anthropic.com/v1" });
    const result = await provider.chat(
      { model: "claude-sonnet-4", messages: [{ role: "user", content: "hi" }], stream: true },
      ctx
    );

    const reader = result.response.body!.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }

    const dataLines = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim());

    expect(dataLines[0]).toContain('"object":"chat.completion.chunk"');
    expect(dataLines[0]).toContain('"role":"assistant"');
    const contentChunks = dataLines
      .map((l) => {
        try {
          return (JSON.parse(l) as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]
            ?.delta?.content;
        } catch {
          return undefined;
        }
      })
      .filter(Boolean);
    expect(contentChunks.join("")).toBe("Hello world");
    expect(dataLines[dataLines.length - 1]).toBe("[DONE]");
  });
});
