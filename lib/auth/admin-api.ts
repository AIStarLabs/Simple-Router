// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { getCurrentUser } from "@/lib/auth/session";
import { apiError } from "@/lib/api";

export async function adminGuard() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "Unauthorized", "auth_required");
  return { user };
}
