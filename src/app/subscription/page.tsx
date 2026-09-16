"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, CreditCard, Loader2, RefreshCw, Ban, Crown, Building2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PLANS, formatRub, planSavings, planName } from "@/lib/plans";
import { useCatalog } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

export default function SubscriptionPage() {
  const { user, hasSubscription, isPremium, buySubscription, confirmPayment, cancelSubscription } = useAuth();
  const { organizations } = useCatalog();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const expiredPremium = user && user.premiumUntil && new Date(user.premiumUntil).getTime() <= Date.now();
  const myOrgs = user ? organizations.filter((o) => o.ownerId === user.id) : [];
  const frozenOrgs = myOrgs.filter((o) => o.ownerPremiumActive === false);

  const buy = async (plan: string) => {
    if (!user) return;
    setBusy(plan);
    setError(null);
    const err = await buySubscription(plan);
    if (err) {
      setError(err);
      setBusy(null);
    } else {
      toast.success(expiredPremium ? "Подписка активирована — сообщества разморожены" : "Подписка активирована");
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Подписка Премиум</h1>
        <p className="text-sm text-muted-foreground">
          Глобальная подписка открывает все материалы платформы и даёт право создавать и управлять сообществами. Оплата через ЮKassa.
        </p>
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

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><Crown className="size-4 text-amber-500" />Создание сообществ</div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" />Создавайте сообщества и управляйте их каталогом</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" />Платные и бесплатные секции, курсы и услуги от имени группы</li>
              <li className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0" />Назначайте модераторов и авторов, ведите новости</li>
            </ul>
          </div>
          <div className="space-y-1.5 rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="size-4 text-muted-foreground" />Если подписка истечёт</div>
            <p className="text-sm text-muted-foreground">
              Сообщество переходит в режим поддержки: можно редактировать существующие материалы и секции, но публиковать новое и принимать участников нельзя.
              Возобновите подписку — и всё снова заработает.
            </p>
          </div>
        </CardContent>
      </Card>

      {expiredPremium && myOrgs.length > 0 && (
        <Card className="border-amber-500/40">
          <CardContent className="flex flex-col gap-2 py-4 text-sm">
            <div className="inline-flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-4" />Ваша Премиум-подписка истекла
            </div>
            <p className="text-muted-foreground">
              {frozenOrgs.length > 0
                ? `Сообщества временно заморожены (${frozenOrgs.length}): доступно только редактирование существующих данных.`
                : "Возобновите подписку, чтобы сообщества полностью заработали."}
            </p>
            <p className="text-xs text-muted-foreground">
              {myOrgs.map((o) => o.name).join(", ")}
            </p>
            {frozenOrgs.length > 0 && (
              <Link href="/organizations" className="text-sm font-medium text-primary hover:underline">Открыть мои сообщества →</Link>
            )}
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
                  <li className="flex items-start gap-2"><Crown className="mt-0.5 size-4 shrink-0" />Премиум: создание и управление сообществами</li>
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
          <CardContent className="flex flex-col gap-2 py-5 text-sm">
            {user?.subscriptionExpiresAt && (
              <span className="text-muted-foreground">
                Доступ до <span className="font-medium text-foreground">{new Date(user.subscriptionExpiresAt).toLocaleDateString("ru-RU")}</span>
                {isPremium && <span className="ml-2 inline-flex items-center gap-1"><Crown className="size-3 text-amber-500" />Премиум активен</span>}
              </span>
            )}
            {user?.cancelAtPeriodEnd ? (
              <span className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400"><Ban className="size-4" />Автопродление отключено. Доступ сохранится до конца оплаченного периода, деньги не возвращаем.</span>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span>Тариф «{planName(user?.subscriptionPlan)}» активен. Оплаченный период открыт полностью.</span>
                <Button variant="ghost" size="sm" className="action-btn sm:ml-auto" onClick={() => {
                  if (window.confirm("Прекратить автоматические списания? Доступ сохранится до конца оплаченного периода. Деньги за него не возвращаются.")) cancelSubscription();
                }}>
                  <Ban />Прекратить списания
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="size-4" />Подписка и сообщества</CardTitle>
          <CardDescription>
            Кратко: подписка = доступ ко всем материалам + право владеть сообществами.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>· Создать сообщество может только пользователь с активной подпиской (Премиум).</p>
          <p>· Пока подписка активна, вы публикуете материалы, курсы, услуги, секции и объявления в своих сообществах и принимаете участников.</p>
          <p>· Когда подписка истекает, ваши сообщества замораживаются: остаётся только редактировать уже существующие данные. Новое публиковать нельзя.</p>
          <p>· Администрация платформы может выдать или снять подписку вручную.</p>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Правила использования</CardTitle>
          <CardDescription>
            Покупая доступ, вы соглашаетесь соблюдать условия. Материалы защищены персональным водяным знаком с вашим именем и почтой — пересылка и публикация файлов (включая скриншоты) запрещены.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>· Не передавайте файлы и ссылки третьим лицам и не публикуйте их в открытом доступе.</p>
          <p>· Каждая копия помечена данными покупателя: утечка легко находится по метке.</p>
          <p>· За нарушение доступ блокируется без возврата средств, аккаунт может быть удалён.</p>
          <p>· Оплаченный период не возвращается при отмене автопродления.</p>
        </CardContent>
      </Card>
    </div>
  );
}