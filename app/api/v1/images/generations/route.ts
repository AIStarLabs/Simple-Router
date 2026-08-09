// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { handleGatewayRequest } from "@/lib/gateway/handler";
import { imagesSchema } from "@/lib/validation/schemas";
import { withCors, corsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  return withCors(
    await handleGatewayRequest(req, {
      method: "images",
      endpoint: "/v1/images/generations",
      parse: (body) => {
        const parsed = imagesSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Invalid request");
        }
        return { model: parsed.data.model };
      },
    })
  );
}
