// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { listProviders, createProvider } from "@/lib/services/providers";
import { providerCreateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const providers = await listProviders();
  return NextResponse.json({ providers });
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
  const parsed = providerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const provider = await createProvider(parsed.data);
    return NextResponse.json({ provider }, { status: 201 });
  } catch (e) {
    const err = e as { code?: string; message: string };
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A provider with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
