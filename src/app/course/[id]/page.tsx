"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpenCheck, Sparkles, FileText, ExternalLink } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth, canAccessFull } from "@/lib/auth";
import { sectionSoftStyle } from "@/lib/sections";
import FavoriteButton from "@/components/FavoriteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { courses, materials, subjects, sections, organizations, sectionColors, loading } = useCatalog();
  const { role, hasSubscription, user } = useAuth();
  const full = canAccessFull(role, hasSubscription, user?.subscriptionExpiresAt);

  const course = courses.find((c) => c.id === id);

  const org = course?.organizationId ? organizations.find((o) => o.id === course.organizationId) : undefined;

  const moduleCount = course ? course.modules.length : 0;
  const totalMaterials = useMemo(() => {
    if (!course) return 0;
    return course.modules.reduce((n, m) => n + m.materialIds.length, 0);
  }, [course]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><BookOpenCheck className="size-4 animate-pulse" />Загрузка...</CardContent></Card>
    );
  }

  if (!course) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <BookOpenCheck className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Курс не найден</p>
            <p className="text-sm text-muted-foreground">Возможно, он был удалён или ссылка устарела.</p>
          </div>
          <Button asChild variant="outline" className="action-btn"><Link href="/courses"><ArrowLeft />Все курсы</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const promoted = course.promotedUntil && new Date(course.promotedUntil).getTime() > Date.now();
  const subjName = (sid: string) => subjects.find((s) => s.id === sid)?.name ?? sid;
  const typeName = (lid: string) => sections.find((t) => t.id === lid)?.name ?? lid;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="action-btn shrink-0">
        <Link href="/courses"><ArrowLeft />Все курсы</Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {promoted && <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400"><Sparkles className="size-3" />В топе</Badge>}
            <Badge variant="secondary">{moduleCount} модул.</Badge>
            <Badge variant="outline">{totalMaterials} мат.</Badge>
            {course.price != null && course.price > 0 && <Badge variant="price">{course.price} ₽</Badge>}
            {course.price != null && course.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
            {org && <Link href={`/organization/${org.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">← {org.name}</Link>}
            {full ? (
              <Badge variant="success">Доступ открыт</Badge>
            ) : (
              <Badge variant="warning">Материалы по подписке</Badge>
            )}
            <span className="ml-auto"><FavoriteButton materialId={course.id} /></span>
          </div>
          <CardTitle className="text-2xl leading-tight">{course.title}</CardTitle>
          {course.description && <CardDescription className="text-base">{course.description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {full ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
              Все материалы курса доступны по вашей подписке.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm text-muted-foreground">Оформите подписку, чтобы открывать материалы курса.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild><Link href="/subscription">Выбрать тариф</Link></Button>
                {!user && <Button size="sm" variant="outline" asChild><Link href="/login">Войти</Link></Button>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {course.modules.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Содержимое курса ещё в работе.</CardContent></Card>
        )}
        {course.modules.map((mod, modIdx) => {
          const modMaterials = mod.materialIds.map((mid) => materials.find((m) => m.id === mid)).filter(Boolean);
          return (
            <Card key={mod.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{modIdx + 1}</span>
                  {mod.title}
                </CardTitle>
                <CardDescription>{modMaterials.length} материалов</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {modMaterials.map((m) => m && (
                  <div key={m.id} className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{m.title}</span>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge variant="secondary">{subjName(m.subjectId)}</Badge>
                        <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType] ?? "#64748b")}>{typeName(m.lessonType)}</Badge>
                        {m.price != null && m.price > 0 && <span className="text-foreground/70">{m.price} ₽</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {m.fileName && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><FileText className="size-3" />{m.fileName}</span>}
                      {m.hasDrive && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ExternalLink className="size-3" />Диск</span>}
                      <Button variant="outline" size="sm" asChild className="action-btn"><Link href={`/material/${m.id}`}>Открыть</Link></Button>
                    </div>
                  </div>
                ))}
                {modMaterials.length === 0 && <p className="text-sm text-muted-foreground">Пока пусто.</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}