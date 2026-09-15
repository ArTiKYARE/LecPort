import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readUsers, toPublic } from "@/lib/server/users";
import { signSession, setSessionCookie } from "@/lib/server/session";
import { logAudit } from "@/lib/server/audit";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) return NextResponse.json({ error: "Введите email и пароль" }, { status: 400 });

  const users = await readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

  const token = signSession({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);
  await logAudit({
    userId: user.id,
    email: user.email,
    userName: user.name,
    role: user.role,
    action: "login",
    details: `Вход: ${user.email}`,
    ip: getIp(req),
  });
  return NextResponse.json({ user: toPublic(user) });
}
