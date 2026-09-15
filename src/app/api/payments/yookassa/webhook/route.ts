import { NextRequest, NextResponse } from "next/server";
import { activateSubscription } from "@/lib/server/users";
import { logAudit } from "@/lib/server/audit";
import { getYooPayment } from "@/lib/server/yookassa";
import { pendingById, removePending } from "@/lib/server/pending";

/**
 * Вебхук ЮKassa: https://lecport.kos-ko.ru/api/payments/yookassa/webhook
 * Подлинность проверяем запросом статуса платежа в API кассы по shop/secret.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const event = String(body?.event ?? "");
  const objectId = String(body?.object?.id ?? "");
  if (!objectId) return NextResponse.json({ ok: false }, { status: 400 });

  if (event !== "payment.succeeded" && event !== "payment.canceled") {
    return NextResponse.json({ ok: true, ignored: event });
  }

  let payment;
  try {
    payment = await getYooPayment(objectId);
  } catch (e: any) {
    console.error("[yookassa webhook] verify failed:", e.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  if (payment.status === "succeeded") {
    const pending = await pendingById(objectId);
    const userId = payment.metadata?.userId ?? pending?.userId;
    const plan = payment.metadata?.plan ?? pending?.plan ?? "month";
    if (userId) {
      const updated = await activateSubscription(userId, plan);
      await removePending(objectId);
      if (updated) {
        await logAudit({
          userId: updated.id, email: updated.email, userName: updated.name, role: updated.role,
          action: "subscription_buy", details: `Вебхук: оплата ${objectId}, тариф ${plan}`, ip: null,
        });
      }
    }
  } else if (payment.status === "canceled") {
    await removePending(objectId);
  }

  return NextResponse.json({ ok: true });
}
