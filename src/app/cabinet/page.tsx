"use client";
import Link from "next/link";
import { UserRound, CreditCard, FolderOpen, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { useAuth, ROLE_LABELS, canAccessFull } from "@/lib/auth";
import { planById, formatRub } from "@/lib/plans";
import { useCatalog } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CabinetPage() {
  const { user, role, hasSubscription, loading } = useAuth();
  const { materials, subjects, sections } = useCatalog();
  const fullAccess = canAccessFull(role, hasSubscription);
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const typeName = (id: string) => sections.find((t) => t.id === id)?.name ?? id;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="animate-spin size-4" />Загрузка профиля...
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="size-5" />Личный кабинет</CardTitle>
          <CardDescription>Войдите, чтобы видеть подписку и доступные материалы.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><Link href="/login">Войти</Link></Button>
          <Button variant="outline" asChild><Link href="/register">Регистрация</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Личный кабинет</h1>
        <p className="text-sm text-muted-foreground">Профиль, подписка и доступные материалы.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><UserRound className="size-4" />Профиль</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-muted-foreground">{user.email}</div>
            <Badge variant="secondary">{ROLE_LABELS[role]}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4" />Подписка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {hasSubscription ? (
              <>
                <Badge variant="success">Тариф «{planById(user.subscriptionPlan)?.name ?? user.subscriptionPlan}»</Badge>
                <p className="text-muted-foreground">
                  {(() => { const p = planById(user.subscriptionPlan); return p ? `${formatRub(p.priceRub)} · ${p.period}` : ""; })()}
                </p>
                <div><Button variant="outline" size="sm" asChild><Link href="/subscription">Сменить тариф</Link></Button></div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">Подписка не оформлена.</p>
                <Button size="sm" asChild><Link href="/subscription">Оформить</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FolderOpen className="size-4" />Доступ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="text-2xl font-bold">{fullAccess ? materials.length : 0}</div>
            <p className="text-muted-foreground">материалов доступно из {materials.length}</p>
            {(role === "admin" || role === "moderator") && <Badge variant="outline"><ShieldCheck />Полный служебный доступ</Badge>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Мои материалы</CardTitle>
          <CardDescription>{fullAccess ? "Полные файлы и ссылки открыты." : "Без подписки доступны только превью."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(fullAccess ? materials : []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <Link href={`/material/${m.id}`} className="truncate font-medium hover:underline">{m.title}</Link>
                <div className="text-xs text-muted-foreground">{typeName(m.lessonType)} · {subjName(m.subjectId)}</div>
              </div>
              <Button variant="ghost" size="sm" asChild><Link href={`/material/${m.id}`}>Открыть<ArrowRight /></Link></Button>
            </div>
          ))}
          {!fullAccess && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Оформите подписку, чтобы открыть файлы. <Link href="/subscription" className="underline">Выбрать тариф</Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
