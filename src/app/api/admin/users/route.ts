import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { readUsers, writeUsers, toPublic, grantPremium, revokePremium, grantGlobalSubscription, revokeGlobalSubscription, type UserRole } from "@/lib/server/users";
import { logAudit } from "@/lib/server/audit";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

// GET — список пользователей (только админ)
export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  const users = await readUsers();
  return NextResponse.json({ users: users.map(toPublic) });
}

// PATCH — смена роли / премиум (только админ)
export async function PATCH(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const userId = String(body?.userId ?? "");
  if (!userId) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });

  // Премиум: grant или revoke
  if (body?.premiumAction === "grant") {
    const days = Math.max(1, Math.min(366, Number(body.premiumDays) || 30));
    const user = await grantPremium(userId, days);
    if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    await logAudit({ userId: me.id, email: me.email, userName: me.username ?? me.name ?? null, role: me.role, action: "premium_grant", details: `Премиум ${days} дн. → ${user.email}`, ip: getIp(req) });
    return NextResponse.json({ user });
  }
  if (body?.premiumAction === "revoke") {
    const user = await revokePremium(userId);
    if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    await logAudit({ userId: me.id, email: me.email, userName: me.username ?? me.name ?? null, role: me.role, action: "premium_revoke", details: `Премиум отозван: ${user.email}`, ip: getIp(req) });
    return NextResponse.json({ user });
  }

  // Глобальная подписка Премиум: grant или revoke
  if (body?.subscriptionAction === "grant") {
    const days = Math.max(1, Math.min(366, Number(body.subscriptionDays) || 30));
    const user = await grantGlobalSubscription(userId, days);
    if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    await logAudit({ userId: me.id, email: me.email, userName: me.username ?? me.name ?? null, role: me.role, action: "subscription_grant", details: `Глобальная подписка ${days} дн. → ${user.email}`, ip: getIp(req) });
    return NextResponse.json({ user });
  }
  if (body?.subscriptionAction === "revoke") {
    const user = await revokeGlobalSubscription(userId);
    if (!user) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    await logAudit({ userId: me.id, email: me.email, userName: me.username ?? me.name ?? null, role: me.role, action: "subscription_revoke", details: `Глобальная подписка отозвана: ${user.email}`, ip: getIp(req) });
    return NextResponse.json({ user });
  }

  // Смена роли
  const role = String(body?.role ?? "") as UserRole;
  if (!["buyer", "moderator", "admin"].includes(role)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  if (rec.id === me.id && role !== "admin") {
    return NextResponse.json({ error: "Нельзя снять с себя права администратора" }, { status: 400 });
  }
  const from = rec.role;
  rec.role = role;
  // модераторам и админам открываем полный доступ к материалам
  if (role === "admin" || role === "moderator") rec.hasSubscription = true;
  await writeUsers(users);

  await logAudit({
    userId: me.id,
    email: me.email,
    userName: me.username ?? me.name ?? null,
    role: me.role,
    action: "role_change",
    details: `${rec.email}: ${from} -> ${role}`,
    ip: getIp(req),
  });

  return NextResponse.json({ user: toPublic(rec) });
}
