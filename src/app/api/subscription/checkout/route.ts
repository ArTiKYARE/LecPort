import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { activateSubscription } from "@/lib/server/users";
import { logAudit } from "@/lib/server/audit";
import { createYooPayment, yookassaConfigured, yookassaReturnUrl } from "@/lib/server/yookassa";
import { savePending } from "@/lib/server/pending";
import { planById } from "@/lib/plans";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

/** Создание платежа ЮKassa (или демо-активация, если касса не настроена). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = planById(String(body?.plan ?? ""));
  if (!plan) return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });

  // Без настроенной кассы — демо-режим для локальной разработки.
  if (!yookassaConfigured()) {
    const updated = await activateSubscription(user.id, plan.id);
    await logAudit({
      userId: user.id, email: user.email, userName: user.name, role: user.role,
      action: "subscription_buy", details: `Демо-активация: ${plan.name} (касса не настроена)`, ip: getIp(req),
    });
    return NextResponse.json({ demo: true, user: updated });
  }

  try {
    const payment = await createYooPayment({
      amountRub: plan.priceRub,
      description: `LecPort — подписка «${plan.name}» (${plan.period}), ${user.email}`,
      returnUrl: yookassaReturnUrl(),
      metadata: { userId: user.id, plan: plan.id },
    });
    await savePending(payment.id, { userId: user.id, plan: plan.id, createdAt: new Date().toISOString() });
    await logAudit({
      userId: user.id, email: user.email, userName: user.name, role: user.role,
      action: "subscription_checkout", details: `Платёж ${payment.id}: ${plan.name}, ${plan.priceRub} ₽`, ip: getIp(req),
    });
    return NextResponse.json({ confirmationUrl: payment.confirmation?.confirmation_url ?? null, paymentId: payment.id });
  } catch (e: any) {
    return NextResponse.json({ error: `Не удалось создать платёж: ${e.message}` }, { status: 502 });
  }
}
