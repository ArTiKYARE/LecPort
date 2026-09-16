"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Handshake, Sparkles, Star, Trash2, Send } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { SERVICE_CATEGORIES } from "@/lib/types";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";

export default function ServicePage() {
  const { id } = useParams<{ id: string }>();
  const { services, reviews, organizations, loading, refresh } = useCatalog();
  const { user, role, isPremium } = useAuth();
  const toast = useToast();

  const service = services.find((s) => s.id === id);
  const org = service?.organizationId ? organizations.find((o) => o.id === service.organizationId) : undefined;
  const serviceReviews = useMemo(
    () => reviews.filter((r) => r.targetType === "service" && r.targetId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [reviews, id]
  );

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Handshake className="size-4 animate-pulse" />Загрузка...</CardContent></Card>
    );
  }

  if (!service) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Handshake className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Объявление не найдено</p>
            <p className="text-sm text-muted-foreground">Возможно, оно было удалено или ссылка устарела.</p>
          </div>
          <Button asChild variant="outline" className="action-btn"><Link href="/services"><ArrowLeft />Все услуги</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const categoryName = SERVICE_CATEGORIES.find((c) => c.id === service.category)?.name ?? service.category;
  const promoted = service.promotedUntil && new Date(service.promotedUntil).getTime() > Date.now();

  const submitReview = async () => {
    if (!user) {
      toast.error("Войдите в аккаунт, чтобы оставить отзыв");
      return;
    }
    if (rating < 1) {
      toast.error("Выберите оценку от 1 до 5");
      return;
    }
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "service", targetId: service.id, rating, text }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j?.error ?? "Не удалось сохранить отзыв");
      return;
    }
    toast.success("Отзыв опубликован");
    setRating(0);
    setText("");
    logClient("review_add", `Отзыв на услугу: ${service.title}`);
    refresh();
  };

  const removeReview = async (rid: string) => {
    if (!window.confirm("Удалить этот отзыв?")) return;
    const res = await fetch(`/api/reviews?id=${encodeURIComponent(rid)}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j?.error ?? "Не удалось удалить отзыв");
      return;
    }
    toast.success("Отзыв удалён");
    refresh();
  };

  const myReview = user ? serviceReviews.find((r) => r.authorId === user.id) : undefined;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="action-btn shrink-0">
        <Link href="/services"><ArrowLeft />Все услуги</Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {promoted && <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400"><Sparkles className="size-3" />В топе</Badge>}
            <Badge variant="secondary">{categoryName}</Badge>
            <Badge variant={service.priceType === "hourly" ? "outline" : "price"}>
              {service.priceType === "hourly" ? "Цена за час" : "Фикс. цена за работу"}
            </Badge>
            {org && <Link href={`/organization/${org.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">← {org.name}</Link>}
            {isPremium && <Badge variant="price">Вы — премиум</Badge>}
          </div>
          <CardTitle className="text-2xl leading-tight">{service.title}</CardTitle>
          {service.description && <CardDescription className="text-base whitespace-pre-line">{service.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {service.reviewCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-lg font-medium text-amber-600 dark:text-amber-400">
              <Star className="size-5 fill-current" />{service.rating.toLocaleString("ru-RU")}
              <span className="text-sm font-normal text-muted-foreground">/ 5 · {service.reviewCount} отзывов</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Пока нет отзывов — станьте первым!</span>
          )}
          {service.price != null && (
            <Badge variant="price" className="text-base">{service.price} ₽{service.priceType === "hourly" ? "/час" : ""}</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Star className="size-4 text-amber-500" />Отзывы</CardTitle>
          {user && !myReview && (
            <CardDescription>Расскажите, как прошла работа: это поможет другим выбрать исполнителя.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            myReview ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-medium">Вы уже оставили отзыв ({myReview.rating}/5)</p>
                <p className="mt-1 text-muted-foreground">{myReview.text || "Без текста"}</p>
                <Button size="sm" variant="ghost" className="action-btn mt-2" onClick={() => removeReview(myReview.id)}>
                  <Trash2 />Удалить мой отзыв
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Ваша оценка:</span>
                  <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}
                        className="text-2xl text-muted-foreground transition-colors hover:text-amber-400"
                        aria-label={`Оценка ${n}`}>
                        <Star className={`size-6 ${(hover || rating) >= n ? "fill-amber-400 text-amber-400" : ""}`} />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && <span className="text-sm text-muted-foreground">— {rating}/5</span>}
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="rev-text">Комментарий (необязательно)</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input id="rev-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Как прошла работа?" className="flex-1" />
                    <Button className="action-btn" onClick={submitReview}><Send />Оставить отзыв</Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
              <p className="text-muted-foreground">Чтобы оставить отзыв, войдите в аккаунт.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild><Link href="/login">Войти</Link></Button>
                <Button size="sm" variant="outline" asChild><Link href="/register">Зарегистрироваться</Link></Button>
              </div>
            </div>
          )}

          {serviceReviews.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">Отзывов пока нет.</p>}
          {serviceReviews.map((r) => (
            <div key={r.id} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-500">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.authorName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
                {(user?.id === r.authorId || role === "admin" || role === "moderator") && (
                  <Button size="icon" variant="ghost" className="action-btn size-6" onClick={() => removeReview(r.id)}><Trash2 className="size-3.5" /></Button>
                )}
              </div>
              {r.text && <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}