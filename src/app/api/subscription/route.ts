import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers, toPublic, activateSubscription, cancelAutoRenew } from "@/lib/server/users";
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

  const updated = await activateSubscription(user.id, plan);
  if (!updated) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  await logAudit({
    userId: updated.id,
    email: updated.email,
    userName: updated.name,
    role: updated.role,
    action: "subscription_buy",
    details: `Подписка: ${plan}`,
    ip: getIp(req),
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  const updated = await cancelAutoRenew(user.id);
  if (!updated) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  await logAudit({
    userId: updated.id,
    email: updated.email,
    userName: updated.name,
    role: updated.role,
    action: "subscription_cancel",
    details: "Автопродление отключено (доступ сохранён до конца оплаченного периода)",
    ip: getIp(req),
  });
  return NextResponse.json({ user: updated });
}
