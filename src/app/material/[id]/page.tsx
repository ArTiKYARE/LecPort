"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Download, ExternalLink, Eye, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth, canAccessFull } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { sectionSoftStyle } from "@/lib/sections";
import FavoriteButton from "@/components/FavoriteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MaterialPage() {
  const params = useParams<{ id: string }>();
  const { materials, subjects, sections, organizations, sectionColors, loading } = useCatalog();
  const { user, role, hasSubscription } = useAuth();
  const full = canAccessFull(role, hasSubscription, user?.subscriptionExpiresAt);
  const [access, setAccess] = useState<{ url: string | null; driveUrl: string | null } | null>(null);

  const mat = materials.find((m) => m.id === params?.id);

  useEffect(() => {
    if (mat) logClient("material_view", `Открытие материала: ${mat.id}`);
  }, [mat?.id]);

  useEffect(() => {
    if (!mat || !full) return;
    let cancelled = false;
    setAccess(null);
    fetch(`/api/access/${encodeURIComponent(mat.id)}`, { cache: "no-store" })
      .then((res) => res.json().catch(() => ({})))
      .then((j) => {
        if (!cancelled) setAccess({ url: j.url ?? null, driveUrl: j.driveUrl ?? null });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mat?.id, full]);

  if (loading || !mat) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Загрузка...</span>
          ) : (
            <>Материал не найден. <Link href="/catalog" className="underline">Вернуться в каталог</Link></>
          )}
        </CardContent>
      </Card>
    );
  }

  const subj = subjects.find((s) => s.id === mat.subjectId)?.name ?? mat.subjectId;
  const ltype = sections.find((t) => t.id === mat.lessonType)?.name ?? mat.lessonType;
  const org = mat.organizationId ? organizations.find((o) => o.id === mat.organizationId) : undefined;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/catalog"><ArrowLeft />Каталог</Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{subj}</Badge>
            <Badge variant="outline" style={sectionSoftStyle(sectionColors[mat.lessonType])}>{ltype}</Badge>
            {mat.price != null && mat.price > 0 && <Badge variant="price">{mat.price} ₽</Badge>}
            {mat.price != null && mat.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
            {org && <Link href={`/organization/${org.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">← {org.name}</Link>}
            {full ? <Badge variant="success"><CheckCircle2 />Полный доступ</Badge> : <Badge variant="warning"><Lock />Только превью</Badge>}
            <span className="ml-auto"><FavoriteButton materialId={mat.id} /></span>
          </div>
          <CardTitle className="text-2xl leading-tight">{mat.title}</CardTitle>
          <CardDescription className="text-base">{mat.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Eye className="size-4" />Превью для гостей</div>
            <div className="relative mt-2">
              <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden rounded-md text-xs leading-tight text-muted-foreground/70" style={{ userSelect: "none" }}>
                <div className="absolute -inset-10 grid grid-cols-4 items-center gap-8 opacity-40" style={{ transform: "rotate(-18deg)" }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} className="whitespace-nowrap text-center">{user?.email ?? "lecport"}</span>
                  ))}
                </div>
              </div>
              <p className="relative text-sm text-muted-foreground">{mat.previewText ?? "Превью пока не добавлено. Полное содержимое доступно по подписке."}</p>
            </div>
          </div>

          {full ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4" />Полный доступ</div>
              <div className="mt-3 flex flex-col gap-2">
                {mat.hasFile && (
                  access?.url ? (
                    <Button variant="outline" size="sm" className="w-fit" asChild>
                      <a href={access.url} target="_blank" rel="noreferrer" onClick={() => logClient("material_download", `Скачивание: ${mat.title}`)}><Download />Скачать: {mat.fileName}</a>
                    </Button>
                  ) : (
                    <span className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Подготовка ссылки...</span>
                  )
                )}
                {mat.fileName && !mat.hasFile && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" />{mat.fileName}</span>
                )}
                {mat.hasDrive && (
                  <Button variant="outline" size="sm" className="w-fit" asChild>
                    <a href={access?.driveUrl ?? mat.driveUrl} target="_blank" rel="noreferrer"><ExternalLink />Открыть Google Диск</a>
                  </Button>
                )}
                {!mat.hasFile && !mat.hasDrive && !mat.fileName && (
                  <span className="text-sm text-muted-foreground">Файл пока не прикреплён администратором.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4" />Файл доступен по подписке</div>
              <p className="mt-1 text-sm text-muted-foreground">Войдите в аккаунт и оформите подписку, чтобы скачать файл и открыть ссылку на Диск.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild><Link href="/subscription">Выбрать тариф</Link></Button>
                <Button variant="outline" size="sm" asChild><Link href="/login">Войти</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
