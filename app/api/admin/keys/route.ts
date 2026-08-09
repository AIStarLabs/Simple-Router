// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { listInboundKeys, createInboundKey } from "@/lib/services/api-keys";
import { inboundKeyCreateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const keys = await listInboundKeys();
  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inboundKeyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await createInboundKey(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const err = e as { code?: string; message: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "An API key with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
