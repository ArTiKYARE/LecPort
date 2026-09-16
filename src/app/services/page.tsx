"use client";
import { useMemo, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Handshake, ArrowRight, Sparkles, Star, Plus, Loader2, X } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SERVICE_CATEGORIES } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";

function ServicesInner() {
  const { services, organizations, loading, orgMutate } = useCatalog();
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "";

  const [showCreate, setShowCreate] = useState(false);
  const [sTitle, setSTitle] = useState("");
  const [sDesc, setSDesc] = useState("");
  const [sCategory, setSCategory] = useState<string>(SERVICE_CATEGORIES[0].id);
  const [sPriceType, setSPriceType] = useState<"fixed" | "hourly">("fixed");
  const [sPrice, setSPrice] = useState("");
  const [sOrg, setSOrg] = useState("");
  const [sBusy, setSBusy] = useState(false);

  const orgName = (id?: string) => (id ? organizations.find((o) => o.id === id)?.name : "") ?? "";
  const categoryName = (id: string) => SERVICE_CATEGORIES.find((c) => c.id === id)?.name ?? id;

  const submitService = async () => {
    const title = sTitle.trim();
    if (!title) {
      toast.error("Укажите название");
      return;
    }
    setSBusy(true);
    const price = sPrice.trim() === "" ? undefined : Number(sPrice.trim());
    const snap = await orgMutate("addService", {
      title,
      description: sDesc.trim(),
      category: sCategory,
      priceType: sPriceType,
      price,
      organizationId: sOrg || undefined,
    });
    setSBusy(false);
    if (!snap) {
      toast.error("Не удалось создать объявление");
      return;
    }
    toast.success("Объявление создано");
    setShowCreate(false);
    setSTitle(""); setSDesc(""); setSPrice(""); setSOrg("");
    router.push(`/service/${snap.services[0].id}`);
  };

  const visible = useMemo(() => {
    return services
      .filter((s) => {
        if (cat && s.category !== cat) return false;
        if (!q) return true;
        const hay = (s.title + " " + s.description + " " + categoryName(s.category) + " " + orgName(s.organizationId) + " " + (s.price ?? "")).toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => {
        const ap = a.promotedUntil && new Date(a.promotedUntil).getTime() > Date.now() ? 1 : 0;
        const bp = b.promotedUntil && new Date(b.promotedUntil).getTime() > Date.now() ? 1 : 0;
        if (ap !== bp) return bp - ap;
        return (b.priority ?? 0) - (a.priority ?? 0) || b.createdAt.localeCompare(a.createdAt);
      });
  }, [services, q, cat]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Handshake className="size-4 animate-pulse" />Загрузка услуг...</CardContent></Card>
    );
  }

  const setParam = (key: string, v: string) => {
    const sp = new URLSearchParams(params.toString());
    if (!v) sp.delete(key);
    else sp.set(key, v);
    const qs = sp.toString();
    router.replace(qs ? `/services?${qs}` : "/services", { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Помощь · услуги</h1>
        <p className="text-sm text-muted-foreground">
          Найдите человека или организацию, которые помогут с учёбой: репетиторство, работы на заказ, консультации.
        </p>
      </div>

      {user && (
        <Card>
          {!showCreate ? (
            <CardContent className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Предлагаете помощь или консультации?</span>
              <Button size="sm" variant="outline" className="action-btn" onClick={() => setShowCreate(true)}>
                <Plus />Создать объявление
              </Button>
            </CardContent>
          ) : (
            <CardContent className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Новое объявление</CardTitle>
                <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}><X /></Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="st">Название</Label>
                  <Input id="st" value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="Репетитор по математике" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sd">Описание</Label>
                  <Input id="sd" value={sDesc} onChange={(e) => setSDesc(e.target.value)} placeholder="Что делаете, для кого, как связаться" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sc">Категория</Label>
                  <select id="sc" value={sCategory} onChange={(e) => setSCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Сообщество (необязательно)</Label>
                  <select value={sOrg} onChange={(e) => setSOrg(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Личное объявление</option>
                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Тип цены</Label>
                  <select value={sPriceType} onChange={(e) => setSPriceType(e.target.value as "fixed" | "hourly")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="fixed">За работу</option>
                    <option value="hourly">За час</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sp">Цена, ₽ {sOrg ? "(поставит сообщество)" : ""}</Label>
                  <Input id="sp" type="number" min="0" value={sPrice} onChange={(e) => setSPrice(e.target.value)} placeholder="500" />
                </div>
              </div>
              {sOrg && (
                <p className="text-xs text-muted-foreground">
                  Объявление опубликуется от имени сообщества. Цену установит его создатель/модератор.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="action-btn" disabled={sBusy} onClick={submitService}>
                  {sBusy && <Loader2 className="animate-spin" />}Опубликовать
                </Button>
                <Button size="sm" variant="ghost" className="action-btn" onClick={() => setShowCreate(false)}>Отмена</Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setParam("q", e.target.value)} placeholder="Найти услугу по названию, продавцу или цене..." className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={!cat ? "default" : "secondary"} className="cursor-pointer" onClick={() => setParam("cat", "")}>Все</Badge>
            {SERVICE_CATEGORIES.map((c) => (
              <Badge key={c.id} variant={cat === c.id ? "default" : "secondary"} className="cursor-pointer" onClick={() => setParam("cat", c.id)}>{c.name}</Badge>
            ))}
          </div>
          <Badge variant="secondary" className="self-start">Объявлений: {services.length}</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((s) => {
          const promoted = s.promotedUntil && new Date(s.promotedUntil).getTime() > Date.now();
          return (
            <Card key={s.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {promoted && <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400"><Sparkles className="size-3" />В топе</Badge>}
                  <Badge variant="secondary">{categoryName(s.category)}</Badge>
                  {s.organizationId && orgName(s.organizationId) && (
                    <Link href={`/organization/${s.organizationId}`} className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      {orgName(s.organizationId)}
                    </Link>
                  )}
                </div>
                <CardTitle className="pt-2 text-base leading-snug">{s.title}</CardTitle>
                <CardDescription className="line-clamp-2">{s.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 pt-0">
                {s.reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                    <Star className="size-4 fill-current" />{s.rating.toLocaleString("ru-RU")} <span className="text-xs font-normal text-muted-foreground">({s.reviewCount})</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Без отзывов</span>
                )}
                {s.price != null && s.price > 0 && <Badge variant="price">{s.price} ₽{s.priceType === "hourly" ? "/час" : ""}</Badge>}
                {s.price != null && s.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
                <Button variant="ghost" size="sm" asChild className="ml-auto">
                  <Link href={`/service/${s.id}`}>Подробнее<ArrowRight /></Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visible.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Объявления не найдены. Загляните в ближайшее время.</CardContent></Card>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка услуг...</div>}>
      <ServicesInner />
    </Suspense>
  );
}