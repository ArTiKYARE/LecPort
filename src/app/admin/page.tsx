"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Upload, FileText, Loader2, Users,
  ScrollText, Search, Crown, UserCog, Pencil, Trash2, X, Palette, RotateCcw,
  LayoutGrid, Check, BookOpen,
} from "lucide-react";
import { SECTION_COLOR_PRESETS, type Material, type Section, type Subject } from "@/lib/types";
import { sectionSoftStyle, contrastOn, glassPanel, resolveSubjectColor } from "@/lib/sections";
import { logClient } from "@/lib/audit-client";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, canManageUsers, ROLE_LABELS } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = "materials" | "users" | "audit";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "buyer" | "moderator" | "admin";
  hasSubscription: boolean;
  subscriptionPlan?: string;
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
  page_view: "Просмотр страницы",
};

export default function AdminPage() {
  const { user, role, loading } = useAuth();
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

      {tab === "materials" && <MaterialsTab />}
      {tab === "users" && canManage && <UsersTab />}
      {tab === "audit" && canManage && <AuditTab />}
    </div>
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

function MaterialsTab() {
  const {
    materials, subjects, sections, sectionColors,
    addMaterial, updateMaterial, deleteMaterial,
  } = useCatalog();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [ltype, setLtype] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [keepFile, setKeepFile] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manageQuery, setManageQuery] = useState("");

  const effectiveSubject = subjectId || subjects[0]?.id || "";
  const effectiveType = ltype || sections[0]?.id || "";
  const editing = editingId ? materials.find((m) => m.id === editingId) ?? null : null;

  const resetForm = () => {
    setTitle(""); setDesc(""); setDriveUrl(""); setPreview("");
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
    setFile(null);
    setKeepFile(true);
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
      const patch = {
        title,
        description: desc,
        subjectId: effectiveSubject,
        lessonType: effectiveType,
        driveUrl: driveUrl || undefined,
        previewText: preview || undefined,
        fileUrl,
        fileName: fileName ?? file?.name,
      };
      if (editing) {
        updateMaterial(editing.id, patch);
        logClient("material_update", `Изменён материал: ${title}`);
        setMsg("Изменения сохранены и видны в каталоге.");
      } else {
        addMaterial({ ...patch, id: `m${Date.now()}`, createdAt: new Date().toISOString() });
        setMsg("Материал успешно добавлен и виден в каталоге.");
      }
      resetForm();
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string, title: string) => {
    if (!window.confirm(`Удалить материал «${title}»?`)) return;
    deleteMaterial(id);
    logClient("material_delete", `Удалён материал: ${title}`);
    if (editingId === id) resetForm();
    setMsg("Материал удалён.");
  };

  const managed = materials.filter((m) => {
    if (!manageQuery) return true;
    return (m.title + " " + m.description).toLowerCase().includes(manageQuery.toLowerCase());
  });

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
              {msg && <p className="animate-save-flash text-sm text-muted-foreground">{msg}</p>}
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
            {managed.map((m) => (
              <div key={m.id} className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm sm:flex-row sm:items-center ${editingId === m.id ? "border-primary" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType] ?? "#64748b")}>
                      {sections.find((t) => t.id === m.lessonType)?.name ?? m.lessonType}
                    </Badge>
                    <span>{subjects.find((s) => s.id === m.subjectId)?.name ?? m.subjectId}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(m)} className="action-btn">
                    <Pencil />Редактировать
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id, m.title)} className="action-btn">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            {managed.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Материалы не найдены.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionsCard() {
  const {
    sections, materials, sectionColors,
    renameSection, deleteSection, setSectionColor, resetSectionColors,
  } = useCatalog();
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorFor, setColorFor] = useState<Section | null>(null);
  const [deleteFor, setDeleteFor] = useState<Section | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const countFor = (id: string) => materials.filter((m) => m.lessonType === id).length;

  const saveName = (sec: Section) => {
    const v = nameDraft.trim();
    if (!v || v === sec.name) {
      setEditingNameId(null);
      return;
    }
    renameSection(sec.id, v);
    logClient("section_rename", `Раздел «${sec.name}» → «${v}»`);
    setEditingNameId(null);
    setMsg(`Раздел переименован в «${v}».`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="size-4" />Разделы</CardTitle>
        <CardDescription>Переименование, удаление и цвета. При удалении можно перенести материалы в другой раздел.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((sec) => {
          const color = sectionColors[sec.id] ?? "#64748b";
          return (
            <div key={sec.id} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {editingNameId === sec.id ? (
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName(sec);
                      if (e.key === "Escape") setEditingNameId(null);
                    }}
                    className="h-8"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{sec.name}</span>
                )}
                <Badge variant="secondary" className="shrink-0">{countFor(sec.id)} мат.</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {editingNameId === sec.id ? (
                  <>
                    <Button size="sm" className="action-btn" onClick={() => saveName(sec)}><Check />Сохранить</Button>
                    <Button size="sm" variant="ghost" className="action-btn" onClick={() => setEditingNameId(null)}><X />Отмена</Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="action-btn"
                      onClick={() => { setEditingNameId(sec.id); setNameDraft(sec.name); setMsg(null); }}
                    >
                      <Pencil />Переименовать
                    </Button>
                    <Button size="sm" variant="outline" className="action-btn" onClick={() => setColorFor({ ...sec })}><Palette />Цвет</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="action-btn"
                      disabled={sections.length <= 1}
                      title={sections.length <= 1 ? "Нельзя удалить последний раздел" : "Удалить раздел"}
                      onClick={() => setDeleteFor(sec)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <Button variant="ghost" size="sm" onClick={() => resetSectionColors()} className="action-btn">
          <RotateCcw />Сбросить цвета
        </Button>
        {msg && <p className="animate-save-flash text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
      {colorFor && (
        <SectionColorModal
          sec={sections.find((s) => s.id === colorFor.id) ?? colorFor}
          onClose={() => setColorFor(null)}
        />
      )}
      {deleteFor && (
        <DeleteSectionDialog
          sec={deleteFor}
          onClose={() => setDeleteFor(null)}
          onDone={(text) => { setDeleteFor(null); setMsg(text); }}
        />
      )}
    </Card>
  );
}

function ModalShell({ children, onClose, label, wide }: { children: React.ReactNode; onClose: () => void; label: string; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className={`animate-fade-up max-h-[90vh] w-full overflow-y-auto ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function StructureCard() {
  const { sections, subjects, sectionColors, subjectColors } = useCatalog();
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="size-4" />Структура каталога</CardTitle>
        <CardDescription>Разделы и предметы: названия, удаление и цвета — в отдельных окнах.</CardDescription>
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
            <div className="truncate text-xs text-muted-foreground">{sections.map((s) => s.name).join(", ")}</div>
          </div>
          <Button size="sm" variant="outline" className="action-btn shrink-0" onClick={() => setSectionsOpen(true)}>
            Настроить
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
            <div className="truncate text-xs text-muted-foreground">{subjects.map((s) => s.name).join(", ")}</div>
          </div>
          <Button size="sm" variant="outline" className="action-btn shrink-0" onClick={() => setSubjectsOpen(true)}>
            Настроить
          </Button>
        </div>
      </CardContent>
      {sectionsOpen && (
        <ModalShell wide onClose={() => setSectionsOpen(false)} label="Управление разделами">
          <SectionsCard />
        </ModalShell>
      )}
      {subjectsOpen && (
        <ModalShell wide onClose={() => setSubjectsOpen(false)} label="Управление предметами">
          <SubjectsCard />
        </ModalShell>
      )}
    </Card>
  );
}

function SectionColorModal({ sec, onClose }: { sec: Section; onClose: () => void }) {
  const { materials, sectionColors, setSectionColor } = useCatalog();
  const [draft, setDraft] = useState(sectionColors[sec.id] ?? "#64748b");
  const on = contrastOn(draft);
  const count = materials.filter((m) => m.lessonType === sec.id).length;

  const save = () => {
    setSectionColor(sec.id, draft);
    logClient("section_color", `Цвет раздела «${sec.name}»: ${draft}`);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} label={`Цвет раздела ${sec.name}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4" />Цвет: {sec.name}</CardTitle>
          <CardDescription>Предпросмотр обновляется сразу. Цвет сохранится после нажатия кнопки.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="relative overflow-hidden rounded-lg"
            style={{ background: `linear-gradient(135deg, ${draft}, ${draft}CC)`, border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-6 size-28 rounded-full bg-black/10 blur-2xl" />
            <div className="relative flex items-center gap-3 p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm"
                style={{ ...glassPanel(), color: on }}
              >
                <LayoutGrid className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold" style={{ color: on }}>{sec.name}</div>
                <div className="text-xs" style={{ color: on, opacity: 0.75 }}>{count} мат.</div>
              </div>
              <span
                className="ml-auto rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm"
                style={{ color: on }}
              >
                Так будет в каталоге
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border bg-background p-1"
              aria-label="Произвольный цвет"
            />
            <span className="rounded-md border px-2 py-1 font-mono text-sm uppercase">{draft}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTION_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft(c)}
                className="action-btn size-8 rounded-full border-2"
                style={{
                  backgroundColor: c,
                  borderColor: draft.toLowerCase() === c.toLowerCase() ? "#fff" : "transparent",
                  boxShadow: draft.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}` : "none",
                }}
                title={c}
                aria-label={`Выбрать ${c}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} className="action-btn"><Check />Сохранить цвет</Button>
            <Button variant="outline" onClick={onClose} className="action-btn"><X />Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </ModalShell>
  );
}

function DeleteSectionDialog({ sec, onClose, onDone }: { sec: Section; onClose: () => void; onDone: (msg: string) => void }) {
  const { sections, materials, deleteSection } = useCatalog();
  const affected = materials.filter((m) => m.lessonType === sec.id);
  const targets = sections.filter((s) => s.id !== sec.id);
  const [mode, setMode] = useState<"move" | "delete">(targets.length ? "move" : "delete");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  const confirm = () => {
    if (mode === "move" && targetId) {
      const target = sections.find((s) => s.id === targetId);
      const n = deleteSection(sec.id, { action: "move", moveToId: targetId });
      logClient("section_delete", `Раздел «${sec.name}» удалён, ${n} мат. перенесено в «${target?.name ?? targetId}»`);
      onDone(`Раздел «${sec.name}» удалён, материалов перенесено: ${n}.`);
    } else {
      const n = deleteSection(sec.id, { action: "delete" });
      logClient("section_delete", `Раздел «${sec.name}» удалён вместе с материалами (${n})`);
      onDone(`Раздел «${sec.name}» удалён вместе с материалами (${n}).`);
    }
  };

  return (
    <ModalShell onClose={onClose} label={`Удаление раздела ${sec.name}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Trash2 className="size-4" />Удалить «{sec.name}»?</CardTitle>
          <CardDescription>
            В разделе материалов: {affected.length}. Выберите, что с ними делать.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {affected.length > 0 ? (
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "move" ? "border-primary" : ""}`}>
                <input
                  type="radio"
                  name="del-mode"
                  checked={mode === "move"}
                  onChange={() => setMode("move")}
                  className="mt-1 size-4 accent-current"
                />
                <span className="flex-1">
                  <span className="font-medium">Перенести в другой раздел</span>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "delete" ? "border-destructive" : ""}`}>
                <input
                  type="radio"
                  name="del-mode"
                  checked={mode === "delete"}
                  onChange={() => setMode("delete")}
                  className="mt-1 size-4 accent-current"
                />
                <span>
                  <span className="font-medium">Удалить вместе с материалами ({affected.length})</span>
                  <span className="block text-xs text-muted-foreground">Файлы останутся на диске, но исчезнут из каталога.</span>
                </span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Раздел пуст — его можно безопасно удалить.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={confirm} disabled={mode === "move" && !targetId} className="action-btn">
              <Trash2 />{affected.length > 0 && mode === "move" ? "Перенести и удалить" : "Удалить"}
            </Button>
            <Button variant="outline" onClick={onClose} className="action-btn"><X />Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </ModalShell>
  );
}

function SubjectsCard() {
  const {
    subjects, materials, subjectColors,
    addSubject, renameSubject, deleteSubject, resetSubjectColors,
  } = useCatalog();
  const [newSubject, setNewSubject] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [colorFor, setColorFor] = useState<Subject | null>(null);
  const [deleteFor, setDeleteFor] = useState<Subject | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const countFor = (id: string) => materials.filter((m) => m.subjectId === id).length;

  const saveName = (subj: Subject) => {
    const v = nameDraft.trim();
    if (!v || v === subj.name) {
      setEditingNameId(null);
      return;
    }
    renameSubject(subj.id, v);
    logClient("subject_rename", `Предмет «${subj.name}» → «${v}»`);
    setEditingNameId(null);
    setMsg(`Предмет переименован в «${v}».`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" />Предметы</CardTitle>
        <CardDescription>Переименование, удаление и цвета. При удалении можно перенести материалы в другой предмет.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Новый предмет" />
          <Button variant="outline" className="action-btn" onClick={() => { if (newSubject.trim()) { addSubject(newSubject.trim()); setNewSubject(""); } }}>Добавить</Button>
        </div>
        {subjects.map((subj) => {
          const color = resolveSubjectColor(subjectColors, subj.id);
          return (
            <div key={subj.id} className="rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {editingNameId === subj.id ? (
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName(subj);
                      if (e.key === "Escape") setEditingNameId(null);
                    }}
                    className="h-8"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{subj.name}</span>
                )}
                <Badge variant="secondary" className="shrink-0">{countFor(subj.id)} мат.</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {editingNameId === subj.id ? (
                  <>
                    <Button size="sm" className="action-btn" onClick={() => saveName(subj)}><Check />Сохранить</Button>
                    <Button size="sm" variant="ghost" className="action-btn" onClick={() => setEditingNameId(null)}><X />Отмена</Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="action-btn"
                      onClick={() => { setEditingNameId(subj.id); setNameDraft(subj.name); setMsg(null); }}
                    >
                      <Pencil />Переименовать
                    </Button>
                    <Button size="sm" variant="outline" className="action-btn" onClick={() => setColorFor({ ...subj })}><Palette />Цвет</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="action-btn"
                      disabled={subjects.length <= 1}
                      title={subjects.length <= 1 ? "Нельзя удалить последний предмет" : "Удалить предмет"}
                      onClick={() => setDeleteFor(subj)}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <Button variant="ghost" size="sm" onClick={() => resetSubjectColors()} className="action-btn">
          <RotateCcw />Сбросить цвета к авто
        </Button>
        {msg && <p className="animate-save-flash text-sm text-muted-foreground">{msg}</p>}
      </CardContent>
      {colorFor && (
        <SubjectColorModal
          subj={subjects.find((s) => s.id === colorFor.id) ?? colorFor}
          onClose={() => setColorFor(null)}
        />
      )}
      {deleteFor && (
        <DeleteSubjectDialog
          subj={deleteFor}
          onClose={() => setDeleteFor(null)}
          onDone={(text) => { setDeleteFor(null); setMsg(text); }}
        />
      )}
    </Card>
  );
}

function SubjectColorModal({ subj, onClose }: { subj: Subject; onClose: () => void }) {
  const { materials, subjectColors, setSubjectColor, clearSubjectColor } = useCatalog();
  const [draft, setDraft] = useState(resolveSubjectColor(subjectColors, subj.id));
  const on = contrastOn(draft);
  const count = materials.filter((m) => m.subjectId === subj.id).length;

  const save = () => {
    setSubjectColor(subj.id, draft);
    logClient("subject_color", `Цвет предмета «${subj.name}»: ${draft}`);
    onClose();
  };

  return (
    <ModalShell onClose={onClose} label={`Цвет предмета ${subj.name}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4" />Цвет: {subj.name}</CardTitle>
          <CardDescription>Предпросмотр обновляется сразу. Цвет сохранится после нажатия кнопки.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="relative overflow-hidden rounded-lg"
            style={{ background: `linear-gradient(135deg, ${draft}, ${draft}CC)`, border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-10 -left-6 size-28 rounded-full bg-black/10 blur-2xl" />
            <div className="relative flex items-center gap-3 p-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm"
                style={{ ...glassPanel(), color: on }}
              >
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold" style={{ color: on }}>{subj.name}</div>
                <div className="text-xs" style={{ color: on, opacity: 0.75 }}>{count} мат.</div>
              </div>
              <span
                className="ml-auto rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm"
                style={{ color: on }}
              >
                Так будет в каталоге
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border bg-background p-1"
              aria-label="Произвольный цвет"
            />
            <span className="rounded-md border px-2 py-1 font-mono text-sm uppercase">{draft}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SECTION_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft(c)}
                className="action-btn size-8 rounded-full border-2"
                style={{
                  backgroundColor: c,
                  borderColor: draft.toLowerCase() === c.toLowerCase() ? "#fff" : "transparent",
                  boxShadow: draft.toLowerCase() === c.toLowerCase() ? `0 0 0 2px ${c}` : "none",
                }}
                title={c}
                aria-label={`Выбрать ${c}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} className="action-btn"><Check />Сохранить цвет</Button>
            <Button variant="outline" onClick={() => { clearSubjectColor(subj.id); onClose(); }} className="action-btn">
              <RotateCcw />Автоцвет
            </Button>
            <Button variant="ghost" onClick={onClose} className="action-btn"><X />Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </ModalShell>
  );
}

function DeleteSubjectDialog({ subj, onClose, onDone }: { subj: Subject; onClose: () => void; onDone: (msg: string) => void }) {
  const { subjects, materials, deleteSubject } = useCatalog();
  const affected = materials.filter((m) => m.subjectId === subj.id);
  const targets = subjects.filter((s) => s.id !== subj.id);
  const [mode, setMode] = useState<"move" | "delete">(targets.length ? "move" : "delete");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  const confirm = () => {
    if (mode === "move" && targetId) {
      const target = subjects.find((s) => s.id === targetId);
      const n = deleteSubject(subj.id, { action: "move", moveToId: targetId });
      logClient("subject_delete", `Предмет «${subj.name}» удалён, ${n} мат. перенесено в «${target?.name ?? targetId}»`);
      onDone(`Предмет «${subj.name}» удалён, материалов перенесено: ${n}.`);
    } else {
      const n = deleteSubject(subj.id, { action: "delete" });
      logClient("subject_delete", `Предмет «${subj.name}» удалён вместе с материалами (${n})`);
      onDone(`Предмет «${subj.name}» удалён вместе с материалами (${n}).`);
    }
  };

  return (
    <ModalShell onClose={onClose} label={`Удаление предмета ${subj.name}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Trash2 className="size-4" />Удалить «{subj.name}»?</CardTitle>
          <CardDescription>
            По предмету материалов: {affected.length}. Выберите, что с ними делать.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {affected.length > 0 ? (
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "move" ? "border-primary" : ""}`}>
                <input
                  type="radio"
                  name="del-subj-mode"
                  checked={mode === "move"}
                  onChange={() => setMode("move")}
                  className="mt-1 size-4 accent-current"
                />
                <span className="flex-1">
                  <span className="font-medium">Перенести в другой предмет</span>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </span>
              </label>
              <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "delete" ? "border-destructive" : ""}`}>
                <input
                  type="radio"
                  name="del-subj-mode"
                  checked={mode === "delete"}
                  onChange={() => setMode("delete")}
                  className="mt-1 size-4 accent-current"
                />
                <span>
                  <span className="font-medium">Удалить вместе с материалами ({affected.length})</span>
                  <span className="block text-xs text-muted-foreground">Файлы останутся на диске, но исчезнут из каталога.</span>
                </span>
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">По предмету нет материалов — его можно безопасно удалить.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={confirm} disabled={mode === "move" && !targetId} className="action-btn">
              <Trash2 />{affected.length > 0 && mode === "move" ? "Перенести и удалить" : "Удалить"}
            </Button>
            <Button variant="outline" onClick={onClose} className="action-btn"><X />Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </ModalShell>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

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
    } catch (e: any) {
      setError(e.message);
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
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{u.email} · рег. {new Date(u.createdAt).toLocaleDateString("ru-RU")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <UserCog className="size-4 text-muted-foreground" />
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    title="Назначить роль"
                  >
                    <option value="buyer">Покупатель</option>
                    <option value="moderator">Модератор</option>
                    <option value="admin">Администратор</option>
                  </select>
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

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ action, q, limit: "200" });
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

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [action]);

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
            <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Поиск по email, имени, деталям..." className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="action-btn">Найти</Button>
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
      </CardContent>
    </Card>
  );
}
