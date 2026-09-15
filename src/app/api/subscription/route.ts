import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers, toPublic } from "@/lib/server/users";
import { getSessionUser } from "@/lib/server/session";
import { logAudit } from "@/lib/server/audit";
import { yookassaConfigured } from "@/lib/server/yookassa";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  // В проде с подключённой кассой прямая активация запрещена — только через checkout.
  if (yookassaConfigured()) {
    return NextResponse.json({ error: "Оплата выполняется через кассу" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const plan = String(body?.plan ?? "month");

  const users = await readUsers();
  const rec = users.find((u) => u.id === user.id);
  if (!rec) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  rec.hasSubscription = true;
  rec.subscriptionPlan = plan;
  await writeUsers(users);
  await logAudit({
    userId: rec.id,
    email: rec.email,
    userName: rec.name,
    role: rec.role,
    action: "subscription_buy",
    details: `Подписка: ${plan}`,
    ip: getIp(req),
  });
  return NextResponse.json({ user: toPublic(rec) });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const users = await readUsers();
  const rec = users.find((u) => u.id === user.id);
  if (!rec) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  rec.hasSubscription = false;
  await writeUsers(users);
  await logAudit({
    userId: rec.id,
    email: rec.email,
    userName: rec.name,
    role: rec.role,
    action: "subscription_cancel",
    details: "Отмена подписки",
    ip: getIp(req),
  });
  return NextResponse.json({ user: toPublic(rec) });
}
