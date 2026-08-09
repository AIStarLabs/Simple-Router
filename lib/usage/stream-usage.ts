// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
/**
 * Wraps a streaming SSE Response, extracting the usage object from the final
 * data chunks and calling `onComplete` with the captured completion token
 * count once the stream finishes.
 */
export function interceptStreamForUsage(
  response: Response,
  onComplete: (completionTokens: number) => void
): Response {
  const upstreamBody = response.body;
  if (!upstreamBody) return response;

  const decoder = new TextDecoder();
  let completionTokens = 0;
  let buffer = "";

  const reader = upstreamBody.getReader();

  function extractUsage(payload: string): void {
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      return;
    }
    const obj = json as Record<string, unknown> | null;
    const usage = obj?.usage as Record<string, unknown> | null;
    if (!usage) return;
    const tokens =
      usage.completion_tokens ?? usage.output_tokens ?? usage.completionTokens;
    if (typeof tokens === "number" && tokens > 0) {
      completionTokens = tokens;
    }
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            extractUsage(payload);
          }
          controller.enqueue(value);
        }
      } catch {
        /* stream error — client disconnects */
      } finally {
        if (completionTokens === 0) {
          completionTokens = Math.max(1, Math.ceil((buffer.length || 1) / 4));
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
        onComplete(completionTokens);
      }
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
