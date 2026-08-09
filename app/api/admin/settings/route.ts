// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { getSettings, updateSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(req: Request) {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  try {
    const body = await req.json();
    const settings = await updateSettings(body);
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
