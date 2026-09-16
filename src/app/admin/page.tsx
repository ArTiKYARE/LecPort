"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Upload, FileText, Loader2, Users,
  ScrollText, Search, Crown, UserCog, Pencil, Trash2, X,
  LayoutGrid, Building2, Sparkles, KeyRound,
} from "lucide-react";
import { type Material } from "@/lib/types";
import { sectionSoftStyle, resolveSubjectColor } from "@/lib/sections";
import { logClient } from "@/lib/audit-client";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, canManageUsers, ROLE_LABELS } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";

type Tab = "materials" | "users" | "audit";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "moderator" | "admin";
  hasSubscription: boolean;
  subscriptionPlan?: string;
  premiumUntil?: string;
  createdAt: string;
};

type AuditItem = {
  id: string;
  createdAt: string;
  userId: string | null;
  email: string | null;
  userName: string | null;
  role: string | null;
  action: string;
  details?: string;
};

const ACTION_LABELS: Record<string, string> = {
  register: "Регистрация",
  login: "Вход",
  logout: "Выход",
  subscription_buy: "Покупка подписки",
  subscription_checkout: "Создание платежа",
  subscription_cancel: "Отмена подписки",
  material_view: "Просмотр материала",
  material_download: "Скачивание",
  material_create: "Создание материала",
  material_update: "Изменение материала",
  material_delete: "Удаление материала",
  section_rename: "Переименование раздела",
  section_delete: "Удаление раздела",
  section_color: "Смена цвета раздела",
  subject_rename: "Переименование предмета",
  subject_delete: "Удаление предмета",
  subject_color: "Смена цвета предмета",
  role_change: "Смена роли",
  premium_grant: "Выдача премиума",
  premium_revoke: "Снятие премиума",
  course_create: "Создание курса",
  course_update: "Изменение курса",
  course_delete: "Удаление курса",
  course_promote: "Продвижение курса",
  service_create: "Создание услуги",
  service_update: "Изменение услуги",
  service_delete: "Удаление услуги",
  service_promote: "Продвижение услуги",
  review_add: "Добавление отзыва",
  page_view: "Просмотр страницы",
};

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const catalogLoading = useCatalog().loading;
  const canEdit = role ? canEditMaterials(role) : false;
  const canManage = role ? canManageUsers(role) : false;
  const [tab, setTab] = useState<Tab>("materials");

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Проверка доступа...</CardContent></Card>
    );
  }

  if (!user || !canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" />Панель модерации</CardTitle>
          <CardDescription>Требуется вход под учётной записью модератора или администратора.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button asChild><Link href="/login">Войти</Link></Button>
          {process.env.NODE_ENV !== "production" && (
            <span className="text-xs text-muted-foreground">Демо-админ: admin@lecport.local / admin123</span>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {canManage ? "Администрирование" : "Панель модератора"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "Материалы, пользователи и роли, журнал действий."
              : "Загрузка лекций, практик и лабораторных."}
          </p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {ROLE_LABELS[role]}: {user.name}
        </Badge>
      </div>

      <div className="flex gap-1 rounded-lg border bg-card p-1 text-sm">
        <TabButton active={tab === "materials"} onClick={() => setTab("materials")} icon={Upload} label="Материалы" />
        {canManage && (
          <>
            <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users} label="Пользователи и роли" />
            <TabButton active={tab === "audit"} onClick={() => setTab("audit")} icon={ScrollText} label="Аудит действий" />
          </>
        )}
      </div>

      {catalogLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />Загрузка каталога...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <LegacyImportCard />
          {tab === "materials" && <MaterialsTab />}
          {tab === "users" && canManage && <UsersTab />}
          {tab === "audit" && canManage && <AuditTab />}
        </div>
      )}
    </div>
  );
}

function LegacyImportCard() {
  const { legacy, importLegacy, discardLegacy, busy } = useCatalog();
  const toast = useToast();
  if (!legacy) return null;
  const sectionsCount = legacy.sections?.length ?? 0;
  const subjectsCount = legacy.subjects?.length ?? 0;
  const materialsCount = legacy.materials?.length ?? 0;
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-amber-700 dark:text-amber-300">
          <Upload className="size-4" />Данные в этом браузере
        </CardTitle>
        <CardDescription>
          Найдены данные, добавленные раньше (только в этом браузере): {sectionsCount} разделов, {subjectsCount} предметов,
          {materialsCount} материалов. Перенесите их на сервер, чтобы они стали видны всем пользователям — дальше всё хранится в общем каталоге.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" onClick={async () => { await importLegacy(); toast.success("Данные перенесены в общий каталог"); }} disabled={busy} className="action-btn">
          {busy && <Loader2 className="size-4 animate-spin" />}Перенести на сервер
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { discardLegacy(); toast.info("Данные из браузера удалены"); }} className="action-btn">Удалить из браузера</Button>
      </CardContent>
    </Card>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Upload; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "bg-secondary text-secondary-foreground"
      )}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(" ")[0]}</span>
    </button>
  );
}

/** Постраничная навигация с выбором размера страницы. */
function Pager({ page, pageSize, total, onPage, onPageSize, pageSizes = [10, 20, 50, 100], totalLabel = "запис." }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
  pageSizes?: number[];
  totalLabel?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  const nums: number[] = [];
  const start = Math.max(1, Math.min(cur - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <div className="flex flex-wrap items-center gap-3 border-t pt-3">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Показывать по
        <select
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          {pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <span className="text-sm text-muted-foreground">{totalLabel}: {total}</span>
      <div className="ml-auto flex flex-wrap items-center gap-1 text-sm">
        <Button variant="outline" size="sm" className="action-btn" disabled={cur <= 1} onClick={() => onPage(cur - 1)} aria-label="Предыдущая">‹</Button>
        {nums.map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`size-8 rounded-md border text-sm ${n === cur ? "border-primary bg-primary/10 font-semibold text-primary" : "action-btn"}`}
          >
            {n}
          </button>
        ))}
        <Button variant="outline" size="sm" className="action-btn" disabled={cur >= pages} onClick={() => onPage(cur + 1)} aria-label="Следующая">›</Button>
      </div>
    </div>
  );
}

function MaterialsTab() {
  const {
    materials, subjects, sections, organizations, sectionColors,
    addMaterial, updateMaterial, deleteMaterial, promoteMaterial, unpromoteMaterial,
  } = useCatalog();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [ltype, setLtype] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [orgId, setOrgId] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keepFile, setKeepFile] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manageQuery, setManageQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const effectiveSubject = subjectId || subjects[0]?.id || "";
  const effectiveType = ltype || sections[0]?.id || "";
  const editing = editingId ? materials.find((m) => m.id === editingId) ?? null : null;

  const resetForm = () => {
    setTitle(""); setDesc(""); setDriveUrl(""); setPreview("");
    setOrgId(""); setPrice("");
    setFile(null); setKeepFile(true); setEditingId(null); setLtype("");
  };

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDesc(m.description);
    setSubjectId(m.subjectId);
    setLtype(m.lessonType);
    setDriveUrl(m.driveUrl ?? "");
    setPreview(m.previewText ?? "");
    setOrgId(m.organizationId ?? "");
    setPrice(m.price != null ? String(m.price) : "");
    setFile(null);
    setKeepFile(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let fileUrl: string | undefined = editing && keepFile ? editing.fileUrl : undefined;
      let fileName: string | undefined = editing && keepFile ? editing.fileName : undefined;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Ошибка загрузки");
        fileUrl = j.url;
        fileName = j.name;
      } else if (editing && !keepFile) {
        fileUrl = undefined;
        fileName = undefined;
      }
      const parsedPrice = price.trim() === "" ? undefined : Number(price.trim());
      if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
        throw new Error("Некорректная цена");
      }
      const patch = {
        title,
        description: desc,
        subjectId: effectiveSubject,
        lessonType: effectiveType,
        driveUrl: driveUrl || undefined,
        previewText: preview || undefined,
        organizationId: orgId || undefined,
        price: parsedPrice,
        fileUrl,
        fileName: fileName ?? file?.name,
      };
      if (editing) {
        updateMaterial(editing.id, patch);
        logClient("material_update", `Изменён материал: ${title}`);
        toast.success("Изменения сохранены и видны в каталоге");
      } else {
        addMaterial({ ...patch, id: `m${Date.now()}`, createdAt: new Date().toISOString() });
        toast.success("Материал успешно добавлен и виден в каталоге");
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string, title: string) => {
    if (!window.confirm(`Удалить материал «${title}»?`)) return;
    deleteMaterial(id);
    logClient("material_delete", `Удалён материал: ${title}`);
    if (editingId === id) resetForm();
    toast.success(`Материал «${title}» удалён`);
  };

  const orgName = (id?: string) => (id ? organizations.find((o) => o.id === id)?.name : "") ?? "";
  const managed = materials.filter((m) => {
    if (!manageQuery) return true;
    const q = manageQuery.toLowerCase();
    return (
      (m.title + " " + m.description + " " + orgName(m.organizationId) + " " + (m.price ?? "")).toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(managed.length / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageItems = managed.slice((curPage - 1) * pageSize, curPage * pageSize);

  useEffect(() => { setPage(1); }, [manageQuery]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {editing ? <Pencil className="size-4" /> : <Upload className="size-4" />}
              {editing ? `Редактирование: ${editing.title}` : "Новый материал"}
            </CardTitle>
            <CardDescription>Доступно модератору и администратору. Привяжите материал к разделу и предмету.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mtitle">Название</Label>
                <Input id="mtitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Лекция 4: Интегралы" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mdesc">Описание</Label>
                <Input id="mdesc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Краткое содержание материала" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Предмет</Label>
                  <select value={effectiveSubject} onChange={(e) => setSubjectId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Вид занятия</Label>
                  <select value={effectiveType} onChange={(e) => setLtype(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {sections.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Продавец (организация)</Label>
                  <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Без организации (каталог платформы)</option>
                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mprice">Цена продажи, ₽</Label>
                  <Input id="mprice" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Например: 149" />
                  <p className="text-xs text-muted-foreground">Пустое значение — материал входит в подписку или бесплатный.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mdrive">Ссылка Google Диск</Label>
                <Input id="mdrive" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mprev">Текст превью для гостей</Label>
                <Input id="mprev" value={preview} onChange={(e) => setPreview(e.target.value)} placeholder="Первые абзацы материала" />
              </div>
              {editing?.fileName && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={keepFile} onChange={(e) => setKeepFile(e.target.checked)} className="size-4 accent-current" />
                  Оставить текущий файл: <span className="font-medium">{editing.fileName}</span>
                </label>
              )}
              {(!editing || !keepFile) && (
                <div className="space-y-2 animate-fade-up">
                  <Label htmlFor="mfile">Файл (PDF, DOCX, PPTX){editing ? " — замена" : ""}</Label>
                  <Input id="mfile" type="file" accept=".pdf,.docx,.pptx,.doc,.ppt,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy} className="action-btn">
                  {busy && <Loader2 className="animate-spin" />}
                  {editing ? "Сохранить изменения" : "Опубликовать материал"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm} className="action-btn">
                    <X />Отмена
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <StructureCard />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="size-4" />Все материалы ({materials.length})</CardTitle>
          <CardDescription>Редактирование и удаление доступны модератору и администратору.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={manageQuery} onChange={(e) => setManageQuery(e.target.value)} placeholder="Найти материал..." className="pl-9" />
          </div>
          <div className="space-y-2">
            {pageItems.map((m) => (
              <div key={m.id} className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center ${editingId === m.id ? "border-primary" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType] ?? "#64748b")}>
                      {sections.find((t) => t.id === m.lessonType)?.name ?? m.lessonType}
                    </Badge>
                    <span>{subjects.find((s) => s.id === m.subjectId)?.name ?? m.subjectId}</span>
                    {m.organizationId && (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="size-3" />{orgName(m.organizationId)}
                      </Badge>
                    )}
                    {m.price != null && m.price > 0 && <Badge variant="secondary">{m.price} ₽</Badge>}
                    {m.price != null && m.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
                    {m.promotedUntil && new Date(m.promotedUntil).getTime() > Date.now() && (
                      <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400">
                        <Sparkles className="size-3" />В топе до {new Date(m.promotedUntil).toLocaleDateString("ru-RU")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(m)} className="action-btn">
                    <Pencil />Редактировать
                  </Button>
                  {m.promotedUntil && new Date(m.promotedUntil).getTime() > Date.now() ? (
                    <Button variant="ghost" size="sm" className="action-btn" onClick={() => { unpromoteMaterial(m.id); toast.success(`Продвижение «${m.title}» снято`); }}>
                      <Sparkles />Снять из топа
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="action-btn" onClick={() => { promoteMaterial(m.id, 7); logClient("material_promote", `Материал «${m.title}» продвинут`); toast.success(`«${m.title}» добавлен в топ на 7 дней`); }}>
                      <Sparkles />В топ
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id, m.title)} className="action-btn">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            {pageItems.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Материалы не найдены.</p>}
          </div>
          <Pager page={curPage} pageSize={pageSize} total={managed.length} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} totalLabel="материалов" />
        </CardContent>
      </Card>
    </div>
  );
}

function StructureCard() {
  const { sections, subjects, organizations, courses, services, sectionColors, subjectColors } = useCatalog();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="size-4" />Структура каталога</CardTitle>
        <CardDescription>Разделы, предметы и организации редактируются на отдельных страницах — там хватает места для оформления карточек.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
          <div className="flex -space-x-1.5">
            {sections.map((s) => (
              <span
                key={s.id}
                className="size-4 rounded-full border-2 border-card"
                style={{ backgroundColor: sectionColors[s.id] ?? "#64748b" }}
                title={s.name}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">Разделы · {sections.length}</div>
            <div className="line-clamp-2 break-words text-xs text-muted-foreground">{sections.map((s) => s.name).join(", ")}</div>
          </div>
          <Button asChild size="sm" variant="outline" className="action-btn shrink-0">
            <Link href="/admin/sections">Настроить</Link>
          </Button>
        </div>
<div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex -space-x-1.5">
              {subjects.slice(0, 8).map((s) => (
                <span
                  key={s.id}
                  className="size-4 rounded-full border-2 border-card"
                  style={{ backgroundColor: resolveSubjectColor(subjectColors, s.id) }}
                  title={s.name}
                />
              ))}
              {subjects.length > 8 && (
                <span className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-secondary text-[8px] font-bold text-secondary-foreground">
                  +
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Предметы · {subjects.length}</div>
              <div className="line-clamp-3 break-words text-xs text-muted-foreground">{subjects.map((s) => s.name).join(", ")}</div>
            </div>
            <Button asChild size="sm" variant="outline" className="action-btn shrink-0">
              <Link href="/admin/subjects">Настроить</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex -space-x-1.5">
              {organizations.slice(0, 5).map((o) => (
                <span
                  key={o.id}
                  className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-primary/15 text-[8px] font-bold text-primary"
                  title={o.name}
                >
                  {o.name.charAt(0).toUpperCase()}
                </span>
              ))}
              {organizations.length > 5 && (
                <span className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-secondary text-[8px] font-bold text-secondary-foreground">
                  +
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Организации · {organizations.length}</div>
              <div className="line-clamp-3 break-words text-xs text-muted-foreground">{organizations.map((o) => o.name).join(", ")}</div>
            </div>
            <Button asChild size="sm" variant="outline" className="action-btn shrink-0">
              <Link href="/admin/organizations">Настроить</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex -space-x-1.5">
              {courses.slice(0, 5).map((c) => (
                <span
                  key={c.id}
                  className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-amber-500/15 text-[8px] font-bold text-amber-600 dark:text-amber-400"
                  title={c.title}
                >
                  {c.title.charAt(0).toUpperCase()}
                </span>
              ))}
              {courses.length > 5 && (
                <span className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-secondary text-[8px] font-bold text-secondary-foreground">
                  +
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Курсы · {courses.length}</div>
              <div className="line-clamp-3 break-words text-xs text-muted-foreground">{courses.map((c) => c.title).join(", ")}</div>
            </div>
            <Button asChild size="sm" variant="outline" className="action-btn shrink-0">
              <Link href="/admin/courses">Настроить</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex -space-x-1.5">
              {services.slice(0, 5).map((s) => (
                <span
                  key={s.id}
                  className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-sky-500/15 text-[8px] font-bold text-sky-600 dark:text-sky-400"
                  title={s.title}
                >
                  {s.title.charAt(0).toUpperCase()}
                </span>
              ))}
              {services.length > 5 && (
                <span className="flex size-4 items-center justify-center rounded-full border-2 border-card bg-secondary text-[8px] font-bold text-secondary-foreground">
                  +
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Услуги · {services.length}</div>
              <div className="line-clamp-3 break-words text-xs text-muted-foreground">{services.map((s) => s.title).join(", ")}</div>
            </div>
            <Button asChild size="sm" variant="outline" className="action-btn shrink-0">
              <Link href="/admin/services">Настроить</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка загрузки");
      setUsers(j.users);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId: string, role: string) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      setUsers((prev) => prev.map((u) => (u.id === userId ? j.user : u)));
      const name = j.user?.name ?? "Пользователь";
      const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
      toast.success(`Пользователю ${name} назначена роль: ${roleLabel}`);
      logClient("role_change", `Смена роли пользователя ${name} на «${roleLabel}»`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const changePremium = async (userId: string, action: "grant" | "revoke", days = 30) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, premiumAction: action, premiumDays: days }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      setUsers((prev) => prev.map((u) => (u.id === userId ? j.user : u)));
      const name = j.user?.name ?? "Пользователь";
      if (action === "grant") {
        toast.success(`${name} получил премиум на ${days} дн.`);
        logClient("premium_grant", `Премиум ${days} дн. → ${name}`);
      } else {
        toast.success(`Премиум снят у пользователя ${name}`);
        logClient("premium_revoke", `Премиум снят: ${name}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeSubscription = async (userId: string, action: "grant" | "revoke", days = 30) => {
    setBusyId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscriptionAction: action, subscriptionDays: days }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка");
      setUsers((prev) => prev.map((u) => (u.id === userId ? j.user : u)));
      const name = j.user?.name ?? "Пользователь";
      if (action === "grant") {
        toast.success(`${name} получил глобальную подписку Премиум на ${days} дн.`);
        logClient("subscription_grant", `Глобальная подписка ${days} дн. → ${name}`);
      } else {
        toast.success(`Глобальная подписка снята у пользователя ${name}`);
        logClient("subscription_revoke", `Глобальная подписка снята: ${name}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const shown = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" />Пользователи и роли</CardTitle>
        <CardDescription>
          Администратор назначает модераторов и администраторов. Модератор публикует материалы,
          но не управляет пользователями. Покупатель получает доступ по подписке.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[["all", "Все"], ["buyer", "Покупатели"], ["moderator", "Модераторы"], ["admin", "Админы"]].map(([v, label]) => (
            <Button key={v} variant={filter === v ? "default" : "outline"} size="sm" onClick={() => setFilter(v)} className="action-btn">
              {label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" className="action-btn ml-auto" onClick={load}><Loader2 className={loading ? "animate-spin" : "hidden"} />Обновить</Button>
        </div>
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Загрузка...</p>
        ) : (
          <div className="space-y-2">
            {shown.map((u) => (
              <div key={u.id} className="flex flex-col gap-3 rounded-lg border px-3 py-3 text-sm sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    <RoleBadge role={u.role} />
                    {u.hasSubscription && <Badge variant="success">Подписка</Badge>}
                    {u.premiumUntil && new Date(u.premiumUntil).getTime() > Date.now()
                      ? <Badge variant="price">Премиум до {new Date(u.premiumUntil).toLocaleDateString("ru-RU")}</Badge>
                      : u.premiumUntil && <Badge variant="outline">Премиум истёк</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{u.email} · рег. {new Date(u.createdAt).toLocaleDateString("ru-RU")}</div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                  <UserCog className="size-4 shrink-0 text-muted-foreground" />
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:flex-none"
                    title="Назначить роль"
                  >
                    <option value="buyer">Покупатель</option>
                    <option value="moderator">Модератор</option>
                    <option value="admin">Администратор</option>
                  </select>
                  {u.premiumUntil && new Date(u.premiumUntil).getTime() > Date.now() ? (
                    <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changePremium(u.id, "revoke")}>
                      <Crown />Снять премиум
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changePremium(u.id, "grant", 30)} title="Премиум на 30 дней">
                        <Crown />30 дн
                      </Button>
                      <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changePremium(u.id, "grant", 90)} title="Премиум на 90 дней">
                        <Crown />90 дн
                      </Button>
                    </>
                  )}
                  {u.hasSubscription ? (
                    <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changeSubscription(u.id, "revoke")} title="Снять глобальную подписку Премиум">
                      <KeyRound className="size-4" />Снять подписку
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changeSubscription(u.id, "grant", 30)} title="Глобальная подписка Премиум на 30 дней — доступ + право создавать сообщества">
                        <KeyRound className="size-4" />Подписка 30 дн
                      </Button>
                      <Button size="sm" variant="outline" className="action-btn" disabled={busyId === u.id} onClick={() => changeSubscription(u.id, "grant", 365)} title="Глобальная подписка Премиум на год">
                        <KeyRound className="size-4" />Год
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {shown.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Пользователи не найдены.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") return <Badge><Crown />Админ</Badge>;
  if (role === "moderator") return <Badge variant="secondary"><ShieldCheck />Модератор</Badge>;
  return <Badge variant="outline">Покупатель</Badge>;
}

function AuditTab() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ action, q, limit: String(pageSize), offset: String((page - 1) * pageSize) });
      const res = await fetch(`/api/audit?${sp.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Ошибка загрузки");
      setItems(j.items);
      setTotal(j.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [action, page, pageSize]);

  const search = () => {
    if (page !== 1) setPage(1);
    else load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="size-4" />Журнал действий пользователей</CardTitle>
        <CardDescription>Каждое действие: вход, регистрация, подписка, просмотры, загрузки, смена ролей. Всего записей: {total}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={action} onChange={(e) => setAction(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Все действия</option>
            {Object.entries(ACTION_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Поиск по email, имени, деталям..." className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={search} className="action-btn">Найти</Button>
        </div>
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Загрузка журнала...</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="rounded-lg border px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{ACTION_LABELS[r.action] ?? r.action}</Badge>
                  <span className="font-medium">{r.userName ?? "Гость"}</span>
                  <span className="text-xs text-muted-foreground">{r.email ?? "без email"} · {r.role}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                  </span>
                </div>
                {r.details && <div className="mt-1 text-xs text-muted-foreground"><FileText className="mr-1 inline size-3" />{r.details}</div>}
              </div>
            ))}
            {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Записей нет.</p>}
          </div>
        )}
        <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} totalLabel="записей" />
      </CardContent>
    </Card>
  );
}