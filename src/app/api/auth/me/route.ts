import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionUser } from "@/lib/server/session";
import { logAudit } from "@/lib/server/audit";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function DELETE() {
  const user = await getSessionUser();
  await clearSessionCookie();
  if (user) {
    await logAudit({
      userId: user.id,
      email: user.email,
      userName: user.username ?? user.name ?? null,
      role: user.role,
      action: "logout",
      details: `Выход: ${user.email}`,
      ip: null,
    });
  }
  return NextResponse.json({ ok: true });
}
