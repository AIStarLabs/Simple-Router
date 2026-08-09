// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { exportConfig } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const config = await exportConfig();
  return NextResponse.json({
    filename: `simple-router-config-${new Date().toISOString().slice(0, 10)}.json`,
    config,
  });
}
