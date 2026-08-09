// MIT License — Copyright (c) 2026 HarryDau @ AIStarLabs
import { SignJWT, jwtVerify } from "jose";
import { generateRandomToken } from "@/lib/crypto";

export interface SessionPayload {
  userId: string;
  role: string;
  email: string;
}

export interface ApiTokenPayload {
  sub: string;
  apiKeyId: string;
  name: string;
  type: "inbound";
  iat?: number;
  exp?: number;
}

const SESSION_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "session-secret-change-me"
);

export const SESSION_COOKIE = "sr_session";

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SESSION_SECRET);
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      userId: payload.sub as string,
      role: (payload.role as string) ?? "admin",
      email: (payload.email as string) ?? "",
    };
  } catch {
    return null;
  }
}

export async function signApiToken(payload: ApiTokenPayload): Promise<string> {
  return new SignJWT({ name: payload.name, type: payload.type })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.apiKeyId)
    .setJti(generateRandomToken(8))
    .setIssuedAt()
    .setExpirationTime("1y")
    .sign(SESSION_SECRET);
}

export async function verifyApiToken(
  token: string
): Promise<ApiTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET);
    return {
      sub: payload.sub as string,
      apiKeyId: payload.sub as string,
      name: (payload.name as string) ?? "",
      type: (payload.type as "inbound") ?? "inbound",
    };
  } catch {
    return null;
  }
}
