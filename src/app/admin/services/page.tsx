"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Handshake, Pencil, Trash2, X, Loader2, ShieldCheck, Plus, Sparkles, Check, Star } from "lucide-react";
import { type Service, SERVICE_CATEGORIES, type Review } from "@/lib/types";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, ROLE_LABELS } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

export default function AdminServicesPage() {
  const { user, role, loading } = useAuth();
  const canEdit = role ? canEditMaterials(role) : false;

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Проверка доступа...</CardContent></Card>
    );
  }

  if (!user || !canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />Нет доступа</CardTitle>
          <CardDescription>Требуется вход модератора или администратора.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild><Link href="/login">Войти</Link></Button>
          <Button asChild variant="ghost"><Link href="/admin">Вернуться в админку</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="action-btn shrink-0">
          <Link href="/admin"><ArrowLeft className="size-4" />К панели модерации</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Помощь · услуги</h1>
          <p className="text-sm text-muted-foreground">Объявления об услугах: репетиторство, работы на заказ, консультации. Публикуются в разделе «Помощь» с рейтингом и отзывами.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABELS[role]}: {user.name}</Badge>
      </div>

      <ServicesManager />
    </div>
  );
}

const categoryName = (id: string) => SERVICE_CATEGORIES.find((c) => c.id === id)?.name ?? id;

function ServicesManager() {
  const { services, reviews, organizations, addService, updateService, deleteService, promoteService, unpromoteService, deleteReview } = useCatalog();
  const toast = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<Service | null>(null);
  const [promoteFor, setPromoteFor] = useState<Service | null>(null);
  const [reviewsFor, setReviewsFor] = useState<Service | null>(null);

  const createService = async () => {
    const v = newTitle.trim();
    if (!v) return;
    const created = await addService({ title: v, category: "consult", priceType: "fixed" });
    setNewTitle("");
    if (!created) {
      toast.error("Не удалось создать услугу");
      return;
    }
    setEditingId(created.id);
    logClient("service_create", `Создана услуга: ${created.title}`);
    toast.success(`Услуга «${created.title}» создана — заполните описание, цену и категорию`);
  };

  const removeService = async (s: Service) => {
    if (!window.confirm(`Удалить услугу «${s.title}»? Все отзывы на неё тоже удалятся.`)) return;
    await deleteService(s.id);
    logClient("service_delete", `Удалена услуга: ${s.title}`);
    toast.success(`Услуга «${s.title}» удалена`);
    if (editingId === s.id) setEditingId(null);
  };

  const editCopy = editingId ? services.find((s) => s.id === editingId) ?? null : null;
  const serviceReviews = (id: string) => reviews.filter((r) => r.targetType === "service" && r.targetId === id);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Handshake className="size-4" />Объявления услуг</CardTitle>
          <CardDescription>Новая услуга зразу открывает редактор — задайте категорию, цену и организацию.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название услуги" onKeyDown={(e) => { if (e.key === "Enter") createService(); }} />
            <Button variant="outline" className="action-btn" onClick={createService}>Добавить</Button>
          </div>
          {services.map((s) => {
            const promoted = s.promotedUntil && new Date(s.promotedUntil).getTime() > Date.now();
            return (
              <div key={s.id} className={`overflow-hidden rounded-lg border px-3 py-2.5 ${editingId === s.id ? "border-primary" : ""}`}>
                <div className="flex items-center gap-2">
                  {promoted ? <Sparkles className="size-4 shrink-0 text-amber-500" /> : <Handshake className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title}</span>
                  {promoted && <Badge variant="secondary" className="shrink-0">В топе</Badge>}
                  <Badge variant="secondary" className="shrink-0">{categoryName(s.category)}</Badge>
                  {s.reviewCount > 0 && <Badge variant="secondary" className="shrink-0">★ {s.rating} · {s.reviewCount}</Badge>}
                </div>
                {s.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setPromoteFor(null); setReviewsFor(null); setEditingId(s.id); }}>
                    <Pencil />Редактировать
                  </Button>
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setEditingId(null); setPromoteFor(s); }}>
                    <Sparkles />{promoted ? "Продвижение" : "Продвинуть"}
                  </Button>
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setEditingId(null); setPromoteFor(null); setReviewsFor(s); }}>
                    <Star />Отзывы ({serviceReviews(s.id).length})
                  </Button>
                  <Button size="sm" variant="ghost" className="action-btn" onClick={() => removeService(s)}><Trash2 /></Button>
                </div>
              </div>
            );
          })}
          {services.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Объявлений услуг пока нет.</p>}
        </CardContent>
      </Card>

      {editCopy ? (
        <ServiceEditor
          key={editCopy.id}
          service={editCopy}
          organizations={organizations}
          onExit={() => setEditingId(null)}
          onSave={async (patch) => {
            await updateService(editCopy.id, patch);
            logClient("service_update", `Обновлена услуга: ${patch.title ?? editCopy.title}`);
            toast.success("Услуга сохранена");
          }}
        />
      ) : promoteFor ? (
        <PromotionPanel
          title={promoteFor.title}
          active={Boolean(promoteFor.promotedUntil && new Date(promoteFor.promotedUntil).getTime() > Date.now())}
          until={promoteFor.promotedUntil ?? undefined}
          onPromote={async (days) => {
            await promoteService(promoteFor.id, days);
            logClient("service_promote", `Услуга «${promoteFor.title}» продвинута на ${days} дн.`);
            toast.success(`Услуга «${promoteFor.title}» будет в топе ${days} дн.`);
            setPromoteFor(null);
          }}
          onUnpromote={async () => {
            await unpromoteService(promoteFor.id);
            toast.success(`Продвижение услуги «${promoteFor.title}» снято`);
            setPromoteFor(null);
          }}
          onCancel={() => setPromoteFor(null)}
        />
      ) : reviewsFor ? (
        <ReviewsPanel
          service={reviewsFor}
          reviews={serviceReviews(reviewsFor.id)}
          onDelete={async (r) => {
            await deleteReview(r.id);
            toast.success("Отзыв удалён");
          }}
          onClose={() => setReviewsFor(null)}
        />
      ) : (
        <Card className="flex h-[280px] items-center justify-center text-sm text-muted-foreground xl:h-auto">
          <div className="max-w-sm space-y-2 p-6 text-center">
            <Handshake className="mx-auto size-8 opacity-40" />
            <p>Создайте объявление об услуге: категория, тип цены (за работу или за час), организация-продавец. Рейтинг формируется из отзывов клиентов.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ServiceEditor({ service, organizations, onExit, onSave }: {
  service: Service;
  organizations: ReturnType<typeof useCatalog>["organizations"];
  onExit: () => void;
  onSave: (patch: Partial<Service>) => Promise<void>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [category, setCategory] = useState(service.category);
  const [priceType, setPriceType] = useState<Service["priceType"]>(service.priceType);
  const [price, setPrice] = useState(service.price != null ? String(service.price) : "");
  const [orgId, setOrgId] = useState(service.organizationId ?? "");

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Название не может быть пустым");
      return;
    }
    const parsed = price.trim() === "" ? undefined : Number(price.trim());
    if (price.trim() !== "" && (!Number.isFinite(parsed) || parsed! < 0)) {
      toast.error("Некорректная цена");
      return;
    }
    await onSave({
      title: trimmed,
      description: description.trim() || "",
      category,
      priceType,
      price: parsed,
      organizationId: orgId || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Handshake className="size-4" />Редактор услуги</CardTitle>
        <CardDescription>Опишите, что вы предлагаете, сколько это стоит и кто продавец.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="s-title">Название</Label>
          <Input id="s-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s-desc">Описание</Label>
          <textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Что вы делаете, для кого, какие результаты" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Категория</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {SERVICE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Тип оплаты</Label>
            <select value={priceType} onChange={(e) => setPriceType(e.target.value as Service["priceType"])} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="fixed">Фикс. цена за работу</option>
              <option value="hourly">Цена за час</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s-price">Цена, ₽</Label>
            <Input id="s-price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={priceType === "hourly" ? "Например: 800/час" : "Например: 2500"} />
          </div>
          <div className="space-y-2">
            <Label>Продавец (организация)</Label>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Без организации</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="action-btn" onClick={save}><Check />Сохранить</Button>
          <Button variant="outline" className="action-btn" onClick={onExit}><X />Закрыть</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PromotionPanel({ title, active, until, onPromote, onUnpromote, onCancel }: {
  title: string;
  active: boolean;
  until?: string;
  onPromote: (days: number) => void;
  onUnpromote: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-amber-500" />Продвижение: {title}</CardTitle>
        <CardDescription>Продвинутые объявления показываются первыми в списке «Помощи» и получают значок «В топе». Тариф по плану: неделя — 179 ₽, месяц — 499 ₽.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            Активно до {until ? new Date(until).toLocaleDateString("ru-RU") : "—"}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Объявление пока не в топе.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="action-btn" onClick={() => onPromote(7)}><Sparkles />Неделя (179 ₽)</Button>
          <Button variant="outline" className="action-btn" onClick={() => onPromote(31)}><Sparkles />Месяц (499 ₽)</Button>
          <Button variant="ghost" className="action-btn" onClick={onCancel}><X />Закрыть</Button>
        </div>
        <p className="text-xs text-muted-foreground">Оплата подключается позже — сейчас продвижение устанавливает модератор.</p>
      </CardContent>
    </Card>
  );
}

function ReviewsPanel({ service, reviews, onDelete, onClose }: {
  service: Service;
  reviews: Review[];
  onDelete: (r: Review) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Star className="size-4 text-amber-500" />Отзывы: {service.title}</CardTitle>
        <CardDescription>Рейтинг: <b>{service.rating || "—"}</b> из 5 · {service.reviewCount} отзывов. Можно удалить любой отзыв — рейтинг пересчитается.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Отзывов пока нет.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-lg border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-500">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.authorName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
            {r.text && <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>}
            <Button size="sm" variant="ghost" className="action-btn mt-1" onClick={() => onDelete(r)}><Trash2 />Удалить</Button>
          </div>
        ))}
        <Button variant="outline" className="action-btn" onClick={onClose}><X />Закрыть</Button>
      </CardContent>
    </Card>
  );
}