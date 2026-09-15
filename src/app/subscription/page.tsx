"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, CreditCard, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PLANS, formatRub, planSavings, planName } from "@/lib/plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionPage() {
  const { user, hasSubscription, buySubscription, confirmPayment, cancelSubscription } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const buy = async (plan: string) => {
    if (!user) return;
    setBusy(plan);
    setError(null);
    const err = await buySubscription(plan);
    // при успехе: либо демо-активация, либо редирект на ЮKassa
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  const check = async () => {
    setChecking(true);
    setCheckMsg(null);
    const ok = await confirmPayment();
    setChecking(false);
    setCheckMsg(ok ? "Оплата подтверждена, подписка активна." : "Оплата пока не найдена. Если вы оплатили, подождите минуту и попробуйте снова.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Подписка</h1>
        <p className="text-sm text-muted-foreground">Один тариф открывает все материалы каталога: файлы и ссылки на Google Диск. Оплата через ЮKassa.</p>
      </div>

      {!user && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm"><CreditCard className="size-4" />Для оформления подписки войдите или зарегистрируйтесь.</div>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" size="sm" asChild><Link href="/login">Войти</Link></Button>
              <Button size="sm" asChild><Link href="/register">Регистрация</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const save = planSavings(p);
          const isActive = hasSubscription && user?.subscriptionPlan === p.id;
          return (
            <Card key={p.id} className={p.popular ? "border-primary" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{p.name}</CardTitle>
                  {p.popular && <Badge>Популярный</Badge>}
                </div>
                <CardDescription>{p.period}</CardDescription>
                <div className="pt-2 text-3xl font-bold tracking-tight">{formatRub(p.priceRub)}</div>
                {save > 0 && <div className="text-xs text-emerald-600 dark:text-emerald-400">Выгода {formatRub(save)} от помесячной оплаты</div>}
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" />{f}</li>
                  ))}
                </ul>
                {isActive ? (
                  <Badge variant="success"><Check />Тариф «{p.name}» активен</Badge>
                ) : (
                  <Button className="action-btn w-full" variant={p.popular ? "default" : "outline"} disabled={!user || busy !== null} onClick={() => buy(p.id)}>
                    {busy === p.id && <Loader2 className="animate-spin" />}
                    {user ? `Оплатить ${formatRub(p.priceRub)}` : "Войдите для оплаты"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {user && !hasSubscription && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-5 text-sm sm:flex-row sm:items-center">
            <span>Уже оплатили, но подписка не включилась? Нажмите проверку — сверим статус с кассой.</span>
            <Button variant="outline" size="sm" className="action-btn sm:ml-auto" onClick={check} disabled={checking}>
              {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Проверить оплату
            </Button>
          </CardContent>
        </Card>
      )}
      {checkMsg && <p className="text-sm text-muted-foreground">{checkMsg}</p>}

      {hasSubscription && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-5 text-sm sm:flex-row sm:items-center">
            <span>Тариф «{planName(user?.subscriptionPlan)}» активен.</span>
            <Button variant="ghost" size="sm" className="action-btn sm:ml-auto" onClick={cancelSubscription}>Отменить подписку</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
