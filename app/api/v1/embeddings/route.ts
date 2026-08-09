// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { handleGatewayRequest } from "@/lib/gateway/handler";
import { embeddingsSchema } from "@/lib/validation/schemas";
import { withCors, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  return withCors(
    await handleGatewayRequest(req, {
      method: "embeddings",
      endpoint: "/v1/embeddings",
      parse: (body) => {
        const parsed = embeddingsSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Invalid request");
        }
        return { model: parsed.data.model };
      },
    })
  );
}
