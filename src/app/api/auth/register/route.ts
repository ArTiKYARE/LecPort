import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readUsers, writeUsers, toPublic } from "@/lib/server/users";
import { signSession, setSessionCookie } from "@/lib/server/session";
import { logAudit } from "@/lib/server/audit";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (name.length < 2) return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Пароль — минимум 6 символов" }, { status: 400 });

  const users = await readUsers();
  if (users.some((u) => u.email === email))
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: `u_${Date.now()}`,
    name,
    email,
    passwordHash,
    role: "buyer" as const,
    hasSubscription: false,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await writeUsers(users);

  const token = signSession({ sub: user.id, email: user.email, role: user.role });
  await setSessionCookie(token);
  await logAudit({
    userId: user.id,
    email: user.email,
    userName: user.name,
    role: user.role,
    action: "register",
    details: `Регистрация: ${user.email}`,
    ip: getIp(req),
  });
  return NextResponse.json({ user: toPublic(user) });
}
