// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/admin-api";
import { getDashboardStats } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminGuard();
  if (guard instanceof Response) return guard;
  const stats = await getDashboardStats();
  return NextResponse.json({ stats });
}
