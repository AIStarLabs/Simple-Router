// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { handleGatewayRequest } from "@/lib/gateway/handler";
import { chatCompletionSchema } from "@/lib/validation/schemas";
import { withCors, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  return withCors(
    await handleGatewayRequest(req, {
      method: "chat",
      endpoint: "/v1/chat/completions",
      parse: (body) => {
        const parsed = chatCompletionSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Invalid request");
        }
        return {
          model: parsed.data.model,
          stream: parsed.data.stream,
          messages: parsed.data.messages,
          tools: parsed.data.tools,
        };
      },
    })
  );
}
