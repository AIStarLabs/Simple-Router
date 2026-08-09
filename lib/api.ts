// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(
  status: number,
  message: string,
  code = "api_error",
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: {
        message,
        type: code,
        param: null,
        code,
        ...extra,
      },
    },
    { status }
  );
}

export function validationError(err: ZodError) {
  const first = err.issues[0];
  return apiError(
    400,
    first?.message ?? "Invalid request",
    "invalid_request_error",
    {
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    }
  );
}

export function unauthorized(message = "Authentication required") {
  return apiError(401, message, "invalid_api_key");
}

export function notFound(message = "Not found") {
  return apiError(404, message, "not_found");
}

export function rateLimited(message: string) {
  return apiError(429, message, "rate_limit_exceeded", {
    retryAfter: 60,
  });
}
