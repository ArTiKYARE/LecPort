"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BadgeCheck, Building2, ArrowLeft, ArrowRight, FileText, ExternalLink, Sparkles, Star,
  Users, Crown, Lock, Unlock, Check, X, Settings, Newspaper, Megaphone,
  Plus, Loader2, Upload, ShieldCheck, Info,
} from "lucide-react";
import { useCatalog, type CatalogSnapshot } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { getOrgRole, canPublishContent, canManageOrg, type OrgRole } from "@/lib/types";
import { sectionSoftStyle } from "@/lib/sections";
import { SERVICE_CATEGORIES } from "@/lib/types";
import FavoriteButton from "@/components/FavoriteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgNewsEntry, OrgSection, Material, Organization } from "@/lib/types";
import { useToast } from "@/components/toast";

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const {
    organizations, materials, courses, subjects, sections, sectionColors, services,
    orgMutate, loading, refresh,
  } = useCatalog();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const org = organizations.find((o) => o.id === id);
  // Платформенные админ/модератор получают доступ ко всем сообществам (как владелец в UI).
  const platformOverride = Boolean(user && (user.role === "admin" || user.role === "moderator"));
  const memberRole: OrgRole | null = org && user ? getOrgRole(org, user.id) : null;
  const myRole: OrgRole | null = platformOverride ? "owner" : memberRole;
  const isManager = canManageOrg(myRole);
  const canPublish = canPublishContent(myRole);
  const frozen = org?.ownerPremiumActive === false;
  // Для платформенных админов/модераторов заморозка не действует.
  const frozenForMe = frozen && !platformOverride;

  const orgMaterials = useMemo(() => {
    if (!org) return [];
    return materials.filter((m) => m.organizationId === org.id)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || b.createdAt.localeCompare(a.createdAt));
  }, [materials, org]);

  const orgCourses = useMemo(() => org ? courses.filter((c) => c.organizationId === org.id) : [], [courses, org]);
  const orgServices = useMemo(() => org ? services.filter((s) => s.organizationId === org.id) : [], [services, org]);

  const sectionsForOrg = useMemo(() => {
    if (!org) return [];
    return (org.sections ?? []).map((sec) => ({
      ...sec,
      materials: orgMaterials.filter((m) => m.orgSectionId === sec.id),
    }));
  }, [org, orgMaterials]);

  const materialsWithoutSection = useMemo(() =>
    orgMaterials.filter((m) => !m.orgSectionId || !(org?.sections ?? []).some((s) => s.id === m.orgSectionId)),
    [orgMaterials, org],
  );

  const doJoin = async () => {
    if (!org) return;
    setBusyAction("join");
    const snap = await orgMutate("joinOrganization", { id: org.id });
    setBusyAction(null);
    if (snap) toast.success(org.membership === "request" ? "Заявка отправлена" : "Вы вступили в сообщество");
    else toast.error("Не удалось выполнить действие");
  };

  const doLeave = async () => {
    if (!org) return;
    if (!window.confirm("Покинуть сообщество?")) return;
    setBusyAction("leave");
    await orgMutate("leaveOrganization", { id: org.id });
    setBusyAction(null);
    toast.success("Вы покинули сообщество");
  };

  const doApprove = async (userId: string) => {
    if (!org) return;
    setBusyAction(`approve-${userId}`);
    await orgMutate("approveJoin", { id: org.id, userId });
    setBusyAction(null);
    toast.success("Заявка одобрена");
  };

  const doReject = async (userId: string) => {
    if (!org) return;
    setBusyAction(`reject-${userId}`);
    await orgMutate("rejectJoin", { id: org.id, userId });
    setBusyAction(null);
  };

  const doSetRole = async (userId: string, role: "member" | "author" | "moderator") => {
    if (!org) return;
    setBusyAction(`role-${userId}`);
    await orgMutate("setMemberRole", { id: org.id, userId, role });
    setBusyAction(null);
    toast.success("Роль обновлена");
  };

  const doRemove = async (userId: string) => {
    if (!org) return;
    if (!window.confirm("Удалить участника?")) return;
    setBusyAction(`remove-${userId}`);
    await orgMutate("removeMember", { id: org.id, userId });
    setBusyAction(null);
    toast.success("Участник удалён");
  };

  if (loading) {
    return <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Building2 className="size-4 animate-pulse" />Загрузка...</CardContent></Card>;
  }

  if (!org) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Building2 className="size-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Сообщество не найдено</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Такого сообщества нет, оно было удалено или ссылка устарела. Обычно адрес сообщества выглядит так:
                …/organization/<span className="font-mono">id-сообщества</span>. Проверьте ссылку или выберите сообщество ниже.
              </p>
            </div>
            <Button asChild variant="outline" className="action-btn"><Link href="/organizations"><ArrowLeft />Все сообщества</Link></Button>
          </CardContent>
        </Card>
        {organizations.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Доступные сообщества</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {organizations.slice(0, 8).map((o) => (
                <Card key={o.id} className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary overflow-hidden">
                      {o.avatar ? <img src={o.avatar} alt="" className="size-10 object-cover" /> : o.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.members?.length ?? 0} участн.</p>
                    </div>
                    <Button size="sm" variant="ghost" asChild className="action-btn shrink-0">
                      <Link href={`/organization/${o.id}`}>Открыть<ArrowRight /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const subjName = (sid: string) => subjects.find((s) => s.id === sid)?.name ?? sid;
  const typeName = (lid: string) => sections.find((t) => t.id === lid)?.name ?? lid;

  const sectionPriceLabel = (sec: OrgSection) => {
    const price = sec.price ?? 0;
    if (price <= 0) return null;
    return `${price} ₽`;
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="action-btn shrink-0">
        <Link href="/organizations"><ArrowLeft />Все сообщества</Link>
      </Button>

      {/* ── Шапка сообщества ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary overflow-hidden">
          {org.avatar ? <img src={org.avatar} alt="" className="size-14 object-cover" /> : org.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="truncate">{org.name}</span>
            {org.verified && <BadgeCheck className="size-6 shrink-0 text-sky-500" />}
          </h1>
          {org.description && <p className="text-sm text-muted-foreground">{org.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              {org.membership === "request" ? <Lock className="size-3" /> : <Unlock className="size-3" />}
              {org.membership === "request" ? "Вступление по заявке" : "Открытое"}
            </Badge>
            <span>{(org.members?.length ?? 0) + (org.ownerId ? 1 : 0)} участн.</span>
            {org.ownerId && <span className="text-xs">Создатель: {org.ownerId.slice(0, 12)}…</span>}
            {isManager && myRole && (
              <Badge variant="price">
                {platformOverride ? <ShieldCheck className="size-3" /> : <Crown className="size-3" />}
                {platformOverride
                  ? (user?.role === "admin" ? "Администратор платформы" : "Модератор платформы")
                  : (myRole === "owner" ? "Вы — создатель" : "Модератор")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* ── Заморозка ─────────────────────────────────────────── */}
      {frozen && !platformOverride && (
        <Card className="border-amber-500/40">
          <CardContent className="flex items-start gap-2 py-3 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Сообщество заморожено</p>
              <p className="text-muted-foreground">
                Подписка создателя закончилась, поэтому сообщество переведено в режим поддержки:
                можно только редактировать уже опубликованные данные, а вот публиковать новое и принимать участников нельзя,
                пока создатель не продлит подписку.
              </p>
              {user && myRole && <Link href="/subscription" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">Доступно только редактирование. Подробнее о подписке →</Link>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Вступление ─────────────────────────────────────────── */}
      {user && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
            {platformOverride ? (
              <>
                <ShieldCheck className="size-4 text-primary" />
                <span className="text-muted-foreground">
                  У вас есть доступ модератора платформы ко всем сообществам.
                  {!memberRole && <span className="ml-1">Вы можете отсюда управлять, даже не вступая.</span>}
                </span>
              </>
            ) : myRole ? (
              <>
                <span className="text-muted-foreground">Ваша роль: <b>{myRole === "owner" ? "Владелец" : myRole === "moderator" ? "Модератор" : myRole === "author" ? "Автор" : "Участник"}</b></span>
                {myRole !== "owner" && (
                  <Button variant="ghost" size="sm" className="ml-auto action-btn" disabled={!!busyAction} onClick={doLeave}>Покинуть</Button>
                )}
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Вы не состоите в сообществе</span>
                <Button size="sm" className="ml-auto action-btn" disabled={!!busyAction} onClick={doJoin}>
                  {org.membership === "request" ? "Подать заявку" : "Вступить"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {!user && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="text-muted-foreground">Хотите вступить и участвовать? <b>Войдите или зарегистрируйтесь.</b></span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" asChild className="action-btn"><Link href="/login">Войти</Link></Button>
              <Button size="sm" asChild className="action-btn"><Link href="/register">Регистрация</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Как действовать здесь ─────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="py-3 text-xs text-muted-foreground sm:text-sm">
          <p className="mb-1 font-medium text-foreground">Как действовать в сообществе</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {!user && <li>Войдите в аккаунт, чтобы вступить и открыть материалы.</li>}
            {user && !myRole && <li>Нажмите «Вступить» (или подайте заявку) — так вы попадёте в участники и увидите материалы сообщества.</li>}
            {myRole && !canPublish && <li>Вы участник — автор публикует материалы, вы можете их покупать и открывать.</li>}
            {canPublish && <li>Вы публикуете материалы/курсы/услуги: используйте панель «Управление контентом» ниже.</li>}
            <li>Цены указаны на карточках секций и материалов; покупки оформляются на странице материала/курса/услуги.</li>
          </ul>
        </CardContent>
      </Card>

      {/* ── Как устроено сообщество ───────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="py-4 text-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1.5 text-muted-foreground">
              <p className="font-medium text-foreground">Как устроено сообщество</p>
              <p>· <b>Вступить</b> — кнопка выше. В открытых сообществах вы попадаете сразу, в закрытых — после одобрения заявки.</p>
              <p>· <b>Материалы, курсы и услуги</b> публикуются авторами и модераторами. Стоимость указана на карточке.</p>
              {!user ? <p>· После входа вы сможете вступить и видеть содержимое секций.</p> :
                (myRole && !canPublish) ? <p>· Вам доступно участие и покупка материалов сообщества.</p> :
                canPublish ? <p>· У вас есть право публиковать материалы, курсы и услуги — блок «Управление контентом» ниже.</p> :
                <p>· После вступления вы получите доступ к содержимому сообщества.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Заявки на вступление (для managers) ────────────────── */}
      {isManager && !frozenForMe && (org.joinRequests?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Заявки на вступление ({org.joinRequests!.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {org.joinRequests!.map((uid) => (
              <div key={uid} className="flex items-center gap-2 text-sm">
                <span className="truncate font-medium">{uid}</span>
                <Button size="sm" variant="ghost" className="action-btn" disabled={!!busyAction} onClick={() => doApprove(uid)}>
                  <Check className="size-4" />Одобрить
                </Button>
                <Button size="sm" variant="ghost" className="action-btn text-destructive" disabled={!!busyAction} onClick={() => doReject(uid)}>
                  <X className="size-4" />Отклонить
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Участники (для managers) ───────────────────────────── */}
      {isManager && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="size-4" />Участники ({org.members?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(org.members ?? []).length === 0 && <p className="text-xs text-muted-foreground">Пока нет участников.</p>}
            {(org.members ?? []).map((m) => (
              <div key={m.userId} className="flex items-center gap-2 text-sm">
                <span className="truncate">{m.userId}</span>
                <Badge variant="outline" className="text-xs">{m.role === "moderator" ? "Модератор" : m.role === "author" ? "Автор" : "Участник"}</Badge>
                {myRole === "owner" && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => doSetRole(m.userId, e.target.value as "member" | "author" | "moderator")}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                      disabled={!!busyAction}
                    >
                      <option value="member">Участник</option>
                      <option value="author">Автор</option>
                      <option value="moderator">Модератор</option>
                    </select>
                    <Button size="sm" variant="ghost" className="action-btn text-destructive" disabled={!!busyAction} onClick={() => doRemove(m.userId)}>
                      <X className="size-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Публикация (для авторов и выше, но не во время заморозки) ───────────────────── */}
      {canPublish && !frozenForMe && (
        <PublishPanel
          org={org}
          subjects={subjects}
          sections={sections}
          orgMutate={orgMutate}
          canManage={isManager}
        />
      )}

      {/* ── Секции каталога ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Каталог сообщества</h2>
        {sectionsForOrg.length === 0 && materialsWithoutSection.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">В сообществе пока нет секций и материалов.</CardContent></Card>
        )}
        {sectionsForOrg.map((sec) => {
          const price = sectionPriceLabel(sec);
          return (
            <Card key={sec.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{sec.name}</CardTitle>
                  {price && <Badge variant="price">{price}</Badge>}
                  {!price && <Badge variant="outline">Бесплатно</Badge>}
                </div>
                {sec.description && <CardDescription>{sec.description}</CardDescription>}
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {sec.materials.map((m) => (
                  <MaterialCard key={m.id} m={m} subjName={subjName} typeName={typeName} sectionColors={sectionColors} />
                ))}
                {sec.materials.length === 0 && <p className="text-xs text-muted-foreground">Пусто</p>}
              </CardContent>
            </Card>
          );
        })}
        {materialsWithoutSection.length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Без секции</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {materialsWithoutSection.map((m) => (
                <MaterialCard key={m.id} m={m} subjName={subjName} typeName={typeName} sectionColors={sectionColors} />
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Курсы ──────────────────────────────────────────────── */}
      {orgCourses.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Курсы ({orgCourses.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {orgCourses.map((c) => {
              const materialCount = c.modules.reduce((n, m) => n + m.materialIds.length, 0);
              return (
                <Card key={c.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{c.modules.length} модул.</Badge>
                      <Badge variant="outline">{materialCount} мат.</Badge>
                      {c.price != null && c.price > 0 && <Badge variant="price">{c.price} ₽</Badge>}
                    </div>
                    <CardTitle className="pt-2 text-base leading-snug">{c.title}</CardTitle>
                    {c.description && <CardDescription className="line-clamp-2">{c.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 pt-0">
                    <Button variant="ghost" size="sm" asChild className="ml-auto">
                      <Link href={`/course/${c.id}`}>Открыть курс<ArrowRight /></Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Услуги ─────────────────────────────────────────────── */}
      {orgServices.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Услуги ({orgServices.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {orgServices.map((s) => (
              <Card key={s.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{SERVICE_CATEGORIES.find((c) => c.id === s.category)?.name ?? s.category}</Badge>
                    {s.price != null && s.price > 0 && <Badge variant="price">{s.price} ₽{s.priceType === "hourly" ? "/час" : ""}</Badge>}
                  </div>
                  <CardTitle className="pt-2 text-base leading-snug">{s.title}</CardTitle>
                  {s.description && <CardDescription className="line-clamp-2">{s.description}</CardDescription>}
                </CardHeader>
                <CardContent className="flex items-center gap-2 pt-0">
                  {s.reviewCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                      <Star className="size-4 fill-current" />{s.rating.toLocaleString("ru-RU")} <span className="text-xs font-normal text-muted-foreground">({s.reviewCount})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Без отзывов</span>
                  )}
                  <Button variant="ghost" size="sm" asChild className="ml-auto">
                    <Link href={`/service/${s.id}`}>Подробнее<ArrowRight /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Новостная лента ────────────────────────────────────── */}
      {((org.news?.length ?? 0) > 0) && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><Newspaper className="size-5" />Новости сообщества</h2>
          <div className="space-y-2">
            {(org.news ?? []).slice(0, 20).map((n) => (
              <Card key={n.id}>
                <CardContent className="flex items-start gap-3 py-3 text-sm">
                  <div className="mt-0.5">
                    {n.kind === "announcement" && <Megaphone className="size-4 text-muted-foreground" />}
                    {n.kind === "material" && <FileText className="size-4 text-muted-foreground" />}
                    {n.kind === "course" && <Sparkles className="size-4 text-muted-foreground" />}
                    {n.kind === "service" && <Star className="size-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{n.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {n.kind === "announcement" ? "Объявление" : n.kind === "material" ? "Материал" : n.kind === "course" ? "Курс" : "Услуга"}
                      </Badge>
                    </div>
                    {n.text && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.text}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("ru-RU")} · {n.authorName}
                    </p>
                  </div>
                  {isManager && (
                    <Button variant="ghost" size="sm" className="action-btn shrink-0" disabled={!!busyAction} onClick={async () => {
                      setBusyAction(`news-${n.id}`);
                      await orgMutate("deleteNews", { orgId: org.id, newsId: n.id });
                      setBusyAction(null);
                    }}>
                      <X className="size-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Пустое состояние ───────────────────────────────────── */}
      {orgMaterials.length === 0 && orgCourses.length === 0 && orgServices.length === 0 && (org.news?.length ?? 0) === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
            <p>В сообществе пока нет контента.</p>
            {!user && <p>Войдите, чтобы присоединиться и увидеть материалы.</p>}
            {user && !canPublish && !myRole && <p>Вступите в сообщество или напишите создателю, чтобы добавить контент.</p>}
            {user && canPublish && <p>Добавьте первый материал, курс или услугу, чтобы начать.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MaterialCard({ m, subjName, typeName, sectionColors }: {
  m: Material; subjName: (id: string) => string; typeName: (id: string) => string; sectionColors: Record<string, string>;
}) {
  return (
    <Card key={m.id} className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{subjName(m.subjectId)}</Badge>
          <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType] ?? "#64748b")}>{typeName(m.lessonType)}</Badge>
          {m.promotedUntil && new Date(m.promotedUntil).getTime() > Date.now() && (
            <Badge variant="warning" className="gap-1"><Sparkles className="size-3" />В топе</Badge>
          )}
          {m.price != null && m.price > 0 && <Badge variant="price">{m.price} ₽</Badge>}
          {m.price != null && m.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
        </div>
        <CardTitle className="pt-2 text-base leading-snug">{m.title}</CardTitle>
        <CardDescription className="line-clamp-2">{m.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2 pt-0 text-xs text-muted-foreground">
        {m.fileName && <span className="inline-flex items-center gap-1"><FileText className="size-3" />{m.fileName}</span>}
        {m.driveUrl && <span className="inline-flex items-center gap-1"><ExternalLink className="size-3" />Google Диск</span>}
        <div className="ml-auto flex items-center gap-2">
          <FavoriteButton materialId={m.id} />
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/material/${m.id}`}>Открыть<ArrowRight /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PublishPanel({ org, subjects, sections, orgMutate, canManage }: {
  org: Organization;
  subjects: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  orgMutate: (action: string, data: any) => Promise<CatalogSnapshot | null>;
  canManage: boolean;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"mat" | "sec" | "ann">("mat");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mSubject, setMSubject] = useState(subjects[0]?.id ?? "");
  const [mType, setMType] = useState(sections[0]?.id ?? "");
  const [mSec, setMSec] = useState("");
  const [mPrice, setMPrice] = useState("");
  const [mDrive, setMDrive] = useState("");
  const [mFile, setMFile] = useState<File | null>(null);

  const [secName, setSecName] = useState("");
  const [secDesc, setSecDesc] = useState("");
  const [secPrice, setSecPrice] = useState("");

  const [annTitle, setAnnTitle] = useState("");
  const [annText, setAnnText] = useState("");

  const submitMaterial = async () => {
    const title = mTitle.trim();
    if (!title) { toast.error("Укажите название"); return; }
    setBusy(true);
    try {
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      if (mFile) {
        const fd = new FormData();
        fd.append("file", mFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Ошибка загрузки");
        fileUrl = j.url; fileName = j.name;
      }
      const price = mPrice.trim() === "" ? undefined : Number(mPrice.trim());
      const mat: Material = {
        id: `m${Date.now()}`,
        title,
        description: mDesc.trim(),
        subjectId: mSubject,
        lessonType: mType as any,
        organizationId: org.id,
        orgSectionId: mSec || undefined,
        fileUrl,
        fileName,
        driveUrl: mDrive.trim() || undefined,
        hasFile: !!fileUrl,
        hasDrive: !!mDrive.trim(),
        price,
        createdAt: new Date().toISOString(),
      };
      const snap = await orgMutate("addMaterial", { material: mat });
      if (!snap) { toast.error("Не удалось опубликовать"); return; }
      toast.success("Материал опубликован");
      setMTitle(""); setMDesc(""); setMPrice(""); setMDrive(""); setMFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const submitSection = async () => {
    const name = secName.trim();
    if (!name) { toast.error("Укажите название секции"); return; }
    setBusy(true);
    const price = secPrice.trim() === "" ? undefined : Number(secPrice.trim());
    const snap = await orgMutate("addOrgSection", { orgId: org.id, name, description: secDesc.trim(), price });
    setBusy(false);
    if (!snap) { toast.error("Не удалось создать секцию"); return; }
    toast.success("Секция создана");
    setSecName(""); setSecDesc(""); setSecPrice("");
  };

  const submitAnnouncement = async () => {
    const title = annTitle.trim();
    if (!title) { toast.error("Укажите заголовок"); return; }
    setBusy(true);
    const snap = await orgMutate("postAnnouncement", { orgId: org.id, title, text: annText.trim() });
    setBusy(false);
    if (!snap) { toast.error("Не удалось опубликовать объявление"); return; }
    toast.success("Объявление опубликовано");
    setAnnTitle(""); setAnnText("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Settings className="size-4" />Управление контентом</CardTitle>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant={tab === "mat" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setTab("mat")}>Материал</Badge>
          <Badge variant={tab === "sec" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setTab("sec")}>Секция</Badge>
          <Badge variant={tab === "ann" ? "default" : "secondary"} className="cursor-pointer" onClick={() => setTab("ann")}>Объявление</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tab === "mat" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mat-title">Название*</Label>
                <Input id="mat-title" value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Теорема Виета: разбор" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="mat-desc">Описание</Label>
                <Input id="mat-desc" value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="О чём материал" />
              </div>
              <div className="space-y-2">
                <Label>Предмет</Label>
                <select value={mSubject} onChange={(e) => setMSubject(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Формат</Label>
                <select value={mType} onChange={(e) => setMType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {sections.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Секция каталога</Label>
                <select value={mSec} onChange={(e) => setMSec(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Без секции</option>
                  {(org.sections ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {canManage && (
                <div className="space-y-2">
                  <Label htmlFor="mat-price">Цена, ₽ {mSec ? "(можно оставить пустым)" : ""}</Label>
                  <Input id="mat-price" type="number" min="0" value={mPrice} onChange={(e) => setMPrice(e.target.value)} placeholder="По умолчанию — бесплатно / цена секции" />
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>Файл или ссылка</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileRef} type="file" className="text-xs" onChange={(e) => setMFile(e.target.files?.[0] ?? null)} />
                  {mFile && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3" />{mFile.name}</span>}
                  <span className="text-xs text-muted-foreground">или</span>
                  <Input className="h-8 sm:max-w-64" value={mDrive} onChange={(e) => setMDrive(e.target.value)} placeholder="Ссылка на Google Диск" />
                </div>
              </div>
            </div>
            <Button size="sm" className="action-btn" disabled={busy} onClick={submitMaterial}>
              {busy ? <Loader2 className="animate-spin" /> : <Upload className="size-4" />}Опубликовать материал
            </Button>
          </>
        )}
        {tab === "sec" && (
          <>
            {!canManage && <p className="text-xs text-muted-foreground">Секции создаёт владелец или модератор.</p>}
            {canManage && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sec-name">Название*</Label>
                  <Input id="sec-name" value={secName} onChange={(e) => setSecName(e.target.value)} placeholder="Алгебра" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sec-price">Цена секции, ₽ (необязательно)</Label>
                  <Input id="sec-price" type="number" min="0" value={secPrice} onChange={(e) => setSecPrice(e.target.value)} placeholder="Пусто — бесплатная" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sec-desc">Описание</Label>
                  <Input id="sec-desc" value={secDesc} onChange={(e) => setSecDesc(e.target.value)} placeholder="Что войдёт в секцию" />
                </div>
              </div>
            )}
            {canManage && (
              <Button size="sm" className="action-btn" disabled={busy} onClick={submitSection}>
                {busy && <Loader2 className="animate-spin" />}<Plus />Создать секцию
              </Button>
            )}
          </>
        )}
        {tab === "ann" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="ann-title">Заголовок*</Label>
              <Input id="ann-title" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Начинаем набор в группу" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-text">Текст</Label>
              <Input id="ann-text" value={annText} onChange={(e) => setAnnText(e.target.value)} placeholder="Подробности объявления" />
            </div>
            <Button size="sm" className="action-btn" disabled={busy} onClick={submitAnnouncement}>
              {busy && <Loader2 className="animate-spin" />}<Megaphone className="size-4" />Опубликовать
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
