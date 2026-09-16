"use client";
import { useMemo, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, BookOpenCheck, ArrowRight, Sparkles, Plus, Loader2, X } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";

function CoursesInner() {
  const { courses, materials, organizations, loading, orgMutate } = useCatalog();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  const [showCreate, setShowCreate] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cPrice, setCPrice] = useState("");
  const [cOrg, setCOrg] = useState("");
  const [cBusy, setCBusy] = useState(false);

  const orgName = (id?: string) => (id ? organizations.find((o) => o.id === id)?.name : "") ?? "";

  const submitCourse = async () => {
    const title = cTitle.trim();
    if (!title) {
      toast.error("Укажите название");
      return;
    }
    setCBusy(true);
    const price = cPrice.trim() === "" ? undefined : Number(cPrice.trim());
    const snap = await orgMutate("addCourse", {
      title,
      description: cDesc.trim() || undefined,
      organizationId: cOrg || undefined,
      price,
    });
    setCBusy(false);
    if (!snap) {
      toast.error("Не удалось создать курс");
      return;
    }
    toast.success("Курс создан");
    setShowCreate(false);
    setCTitle(""); setCDesc(""); setCPrice(""); setCOrg("");
    router.push(`/course/${snap.courses[0].id}`);
  };

  const stats = useMemo(() => {
    const materialCount = new Map<string, number>();
    for (const c of courses) {
      let n = 0;
      c.modules.forEach((m) => (n += m.materialIds.length));
      materialCount.set(c.id, n);
    }
    return materialCount;
  }, [courses]);

  const visible = useMemo(() => {
    return courses
      .filter((c) => {
        if (!q) return true;
        const hay = (c.title + " " + (c.description ?? "") + " " + orgName(c.organizationId) + " " + (c.price ?? "")).toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => {
        const ap = a.promotedUntil && new Date(a.promotedUntil).getTime() > Date.now() ? 1 : 0;
        const bp = b.promotedUntil && new Date(b.promotedUntil).getTime() > Date.now() ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return (b.priority ?? 0) - (a.priority ?? 0) || b.createdAt.localeCompare(a.createdAt);
      });
  }, [courses, q]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><BookOpenCheck className="size-4 animate-pulse" />Загрузка курсов...</CardContent></Card>
    );
  }

  const setQ = (v: string) => {
    const sp = new URLSearchParams(params.toString());
    if (!v) sp.delete("q");
    else sp.set("q", v);
    const qs = sp.toString();
    router.replace(qs ? `/courses?${qs}` : "/courses", { scroll: false });
  };

  const totalMaterials = materials.length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Курсы</h1>
        <p className="text-sm text-muted-foreground">
          Структурированные подборки материалов по модулям. Можно создавать свой курс или от имени сообщества.
        </p>
      </div>

      {user && (
        <Card>
          {!showCreate ? (
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Хотите собрать свой курс из материалов каталога?</span>
              <Button size="sm" variant="outline" className="action-btn" onClick={() => setShowCreate(true)}>
                <Plus />Создать курс
              </Button>
            </CardContent>
          ) : (
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Новый курс</CardTitle>
                <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}><X /></Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ct">Название</Label>
                  <Input id="ct" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Математика: 10 модулей" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp">Цена, ₽ {cOrg ? "(поставит сообщество)" : ""}</Label>
                  <Input id="cp" type="number" min="0" value={cPrice} onChange={(e) => setCPrice(e.target.value)} placeholder="299" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="co">Сообщество (необязательно)</Label>
                  <select id="co" value={cOrg} onChange={(e) => setCOrg(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Личный курс</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cd">Описание</Label>
                  <Input id="cd" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="О чём курс" />
                </div>
              </div>
              {cOrg && (
                <p className="text-xs text-muted-foreground">
                  Курс будет опубликован от имени сообщества. Цену установит его создатель/модератор — оставьте поле пустым.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="action-btn" disabled={cBusy} onClick={submitCourse}>
                  {cBusy && <Loader2 className="animate-spin" />}Создать
                </Button>
                <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}>Отмена</Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти курс по названию, продавцу или цене..." className="pl-9" />
          </div>
          <Badge variant="secondary">Курсов: {courses.length} · материалов в каталоге: {totalMaterials}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((c) => {
          const mounted = stats.get(c.id) ?? 0;
          const promoted = c.promotedUntil && new Date(c.promotedUntil).getTime() > Date.now();
          return (
            <Card key={c.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {promoted && <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400"><Sparkles className="size-3" />В топе</Badge>}
                  <Badge variant="secondary">{c.modules.length} модул.</Badge>
                  <Badge variant="outline">{mounted} мат.</Badge>
                  {c.price != null && c.price > 0 && <Badge variant="price">{c.price} ₽</Badge>}
                  {c.price != null && c.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
                  {c.organizationId && orgName(c.organizationId) && (
                    <Link href={`/organization/${c.organizationId}`} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      {orgName(c.organizationId)}
                    </Link>
                  )}
                </div>
                <CardTitle className="pt-2 text-base leading-snug">{c.title}</CardTitle>
                <CardDescription className="line-clamp-2">{c.description}</CardDescription>
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

      {visible.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Курсы не найдены. Загляните в ближайшее время.</CardContent></Card>
      )}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка курсов...</div>}>
      <CoursesInner />
    </Suspense>
  );
}