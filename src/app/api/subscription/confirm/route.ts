import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { activateSubscription, hasFullAccess } from "@/lib/server/users";
import { logAudit } from "@/lib/server/audit";
import { getYooPayment, yookassaConfigured } from "@/lib/server/yookassa";
import { pendingForUser, removePending } from "@/lib/server/pending";

/**
 * Ручная проверка оплаты: пользователь вернулся с ЮKassa,
 * а вебхук ещё не дошёл (или недоступен). Сверяем статус через API кассы.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  if (hasFullAccess(user)) return NextResponse.json({ activated: true, user });

  if (!yookassaConfigured()) return NextResponse.json({ activated: false });

  const pendings = await pendingForUser(user.id);
  for (const { paymentId, rec } of pendings) {
    try {
      const p = await getYooPayment(paymentId);
      if (p.status === "succeeded") {
        const updated = await activateSubscription(user.id, rec.plan);
        await removePending(paymentId);
        await logAudit({
          userId: user.id, email: user.email, userName: user.name, role: user.role,
          action: "subscription_buy", details: `Оплата подтверждена: ${paymentId}, тариф ${rec.plan}`, ip: null,
        });
        return NextResponse.json({ activated: true, user: updated });
      }
      if (p.status === "canceled") await removePending(paymentId);
    } catch {
      // платёж пока не проверяется — пропускаем
    }
  }
  return NextResponse.json({ activated: false });
}
