import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { readUsers, type PublicUser } from "./users";

const COOKIE_NAME = "lecport_session";
const JWT_SECRET = process.env.AUTH_SECRET || "lecport-dev-secret-change-me";

if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
  console.warn("[lecport] AUTH_SECRET не задан — сессии подписаны dev-ключом. Задайте AUTH_SECRET в .env.local!");
}

export type SessionPayload = { sub: string; email: string; role: string };

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "14d" });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const users = await readUsers();
  const u = users.find((x) => x.id === payload.sub);
  if (!u) return null;
  const { passwordHash: _ph, ...pub } = u;
  return pub;
}

export { COOKIE_NAME };
