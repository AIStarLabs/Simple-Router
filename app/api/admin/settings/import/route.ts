// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { importConfig, type ExportConfig } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  try {
    const body = (await req.json()) as ExportConfig;
    if (!body || !Array.isArray(body.providers)) {
      return NextResponse.json({ error: "Invalid config file" }, { status: 400 });
    }
    const result = await importConfig(body);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
