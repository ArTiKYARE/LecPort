"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookOpenCheck, Pencil, Trash2, X, Loader2, ShieldCheck, Plus, ArrowUp, ArrowDown, Sparkles, Check } from "lucide-react";
import { type Course, type CourseModule } from "@/lib/types";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, ROLE_LABELS } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";

export default function AdminCoursesPage() {
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Курсы</h1>
          <p className="text-sm text-muted-foreground">Структурированные продукты из материалов по модулям. Публикуются в разделе «Курсы» с указанием организации и цены.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABELS[role]}: {user.name}</Badge>
      </div>

      <CoursesManager />
    </div>
  );
}

function CoursesManager() {
  const { courses, materials, organizations, addCourse, updateCourse, deleteCourse, promoteCourse, unpromoteCourse } = useCatalog();
  const toast = useToast();
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<Course | null>(null);
  const [promoteFor, setPromoteFor] = useState<Course | null>(null);

  const createCourse = async () => {
    const v = newTitle.trim();
    if (!v) return;
    const created = await addCourse({ title: v });
    setNewTitle("");
    if (!created) {
      toast.error("Не удалось создать курс");
      return;
    }
    setDeleteFor(null);
    setPromoteFor(null);
    setEditingId(created.id);
    logClient("course_create", `Создан курс: ${created.title}`);
    toast.success(`Курс «${created.title}» создан — сразу наполните его материалами`);
  };

  const removeCourse = async (c: Course) => {
    if (!window.confirm(`Удалить курс «${c.title}»? Материалы останутся в каталоге.`)) return;
    await deleteCourse(c.id);
    logClient("course_delete", `Удалён курс: ${c.title}`);
    toast.success(`Курс «${c.title}» удалён`);
    if (editingId === c.id) setEditingId(null);
  };

  const editCopy = editingId ? courses.find((c) => c.id === editingId) ?? null : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="size-4" />Курсы</CardTitle>
          <CardDescription>Новый курс сразу открывает редактор модулей.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название курса" onKeyDown={(e) => { if (e.key === "Enter") createCourse(); }} />
            <Button variant="outline" className="action-btn" onClick={createCourse}>Добавить</Button>
          </div>
          {courses.map((c) => {
            const total = c.modules.reduce((n, m) => n + m.materialIds.length, 0);
            const promoted = c.promotedUntil && new Date(c.promotedUntil).getTime() > Date.now();
            const consumed = editingId === c.id && materialsUsed(c, materials);
            return (
              <div key={c.id} className={`overflow-hidden rounded-lg border px-3 py-2.5 ${editingId === c.id ? "border-primary" : ""}`}>
                <div className="flex items-center gap-2">
                  {promoted ? <Sparkles className="size-4 shrink-0 text-amber-500" /> : <BookOpenCheck className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                  {promoted && <Badge variant="secondary" className="shrink-0">В топе</Badge>}
                  <Badge variant="secondary" className="shrink-0">{c.modules.length} мод. · {total} мат.</Badge>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setPromoteFor(null); setEditingId(c.id); }}>
                    <Pencil />Редактировать
                  </Button>
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setEditingId(null); setPromoteFor(c); }}>
                    <Sparkles />{promoted ? "Продвижение" : "Продвинуть"}
                  </Button>
                  <Button size="sm" variant="ghost" className="action-btn" onClick={() => removeCourse(c)}><Trash2 /></Button>
                </div>
                {consumed && <p className="mt-1 text-xs text-muted-foreground">В курсе: {consumed.length} материалов из {materials.length}.</p>}
              </div>
            );
          })}
          {courses.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Курсов пока нет.</p>}
        </CardContent>
      </Card>

      {editCopy ? (
        <CourseEditor
          key={editCopy.id}
          course={editCopy}
          materials={materials}
          organizations={organizations}
          onExit={() => setEditingId(null)}
          onSave={async (patch) => {
            await updateCourse(editCopy.id, patch);
            logClient("course_update", `Обновлён курс: ${patch.title ?? editCopy.title}`);
            toast.success("Курс сохранён");
          }}
        />
      ) : promoteFor ? (
        <PromotionPanel
          title={promoteFor.title}
          active={Boolean(promoteFor.promotedUntil && new Date(promoteFor.promotedUntil).getTime() > Date.now())}
          until={promoteFor.promotedUntil ?? undefined}
          onPromote={async (days) => {
            await promoteCourse(promoteFor.id, days);
            logClient("course_promote", `Курс «${promoteFor.title}» продвинут на ${days} дн.`);
            toast.success(`Курс «${promoteFor.title}» будет в топе ${days} дн.`);
            setPromoteFor(null);
          }}
          onUnpromote={async () => {
            await unpromoteCourse(promoteFor.id);
            toast.success(`Продвижение курса «${promoteFor.title}» снято`);
            setPromoteFor(null);
          }}
          onCancel={() => setPromoteFor(null)}
        />
      ) : (
        <Card className="flex h-[280px] items-center justify-center text-sm text-muted-foreground xl:h-auto">
          <div className="max-w-sm space-y-2 p-6 text-center">
            <BookOpenCheck className="mx-auto size-8 opacity-40" />
            <p>Создайте курс, затем в редакторе соберите его из материалов по модулям. Цена и организация появятся на карточке курса.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

/** Все материалы, которые уже используются в курсе (для подсчёта). */
function materialsUsed(c: Course, materials: ReturnType<typeof useCatalog>["materials"]) {
  const seen = new Set<string>();
  c.modules.forEach((m) => m.materialIds.forEach((id) => seen.add(id)));
  return materials.filter((m) => seen.has(m.id));
}

function CourseEditor({ course, materials, organizations, onExit, onSave }: {
  course: Course;
  materials: ReturnType<typeof useCatalog>["materials"];
  organizations: ReturnType<typeof useCatalog>["organizations"];
  onExit: () => void;
  onSave: (patch: Partial<Course>) => Promise<void>;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");
  const [price, setPrice] = useState(course.price != null ? String(course.price) : "");
  const [orgId, setOrgId] = useState(course.organizationId ?? "");
  const [modules, setModules] = useState<CourseModule[]>(course.modules.map((m) => ({ ...m, materialIds: [...m.materialIds] })));
  const [pendingMat, setPendingMat] = useState<string>("");

  const usedIds = new Set<string>();
  modules.forEach((m) => m.materialIds.forEach((id) => usedIds.add(id)));
  const available = materials.filter((m) => !usedIds.has(m.id));

  const addModule = () => {
    setModules((prev) => [...prev, { id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: `Модуль ${prev.length + 1}`, materialIds: [] }]);
  };

  const addMaterialTo = (moduleId: string, matId: string) => {
    if (!matId) return;
    setModules((prev) => prev.map((m) => (m.id === moduleId && !m.materialIds.includes(matId) ? { ...m, materialIds: [...m.materialIds, matId] } : m)));
    setPendingMat("");
  };

  const removeMaterialFrom = (moduleId: string, matId: string) => {
    setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, materialIds: m.materialIds.filter((id) => id !== matId) } : m)));
  };

  const moveMat = (moduleId: string, index: number, dir: -1 | 1) => {
    setModules((prev) => prev.map((m) => {
      if (m.id !== moduleId) return m;
      const next = [...m.materialIds];
      const target = index + dir;
      if (target < 0 || target >= next.length) return m;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...m, materialIds: next };
    }));
  };

  const save = async () => {
    const parsed = price.trim() === "" ? undefined : Number(price.trim());
    if (price.trim() !== "" && (!Number.isFinite(parsed) || parsed! < 0)) {
      toast.error("Некорректная цена");
      return;
    }
    await onSave({
      title: title.trim() || course.title,
      description: description.trim() || undefined,
      price: parsed,
      organizationId: orgId || undefined,
      modules: modules.filter((m) => m.materialIds.length > 0),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><BookOpenCheck className="size-4" />Редактор курса</CardTitle>
        <CardDescription>Соберите курс из материалов каталога: добавьте модули и распределите по ним материалы.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="c-title">Название</Label>
          <Input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-desc">Описание</Label>
          <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Что даёт курс и для кого он" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Продавец (организация)</Label>
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Без организации</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-price">Цена курса, ₽</Label>
            <Input id="c-price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Например: 890" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Модули курса</span>
            <Button size="sm" variant="outline" className="action-btn" onClick={addModule}><Plus />Модуль</Button>
          </div>
          {modules.map((mod, modIdx) => (
            <div key={mod.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input value={mod.title} onChange={(e) => setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, title: e.target.value } : m)))} className="h-8 font-medium" />
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="action-btn size-8" disabled={modIdx === 0} onClick={() => setModules((prev) => { const next = [...prev]; [next[modIdx], next[modIdx - 1]] = [next[modIdx - 1], next[modIdx]]; return next; })}><ArrowUp className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="action-btn size-8" disabled={modIdx === modules.length - 1} onClick={() => setModules((prev) => { const next = [...prev]; [next[modIdx], next[modIdx + 1]] = [next[modIdx + 1], next[modIdx]]; return next; })}><ArrowDown className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="action-btn size-8" onClick={() => setModules((prev) => prev.filter((m) => m.id !== mod.id))}><Trash2 className="size-4" /></Button>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {mod.materialIds.map((mid, i) => {
                  const mat = materials.find((m) => m.id === mid);
                  if (!mat) return null;
                  return (
                    <div key={mid} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{mat.title}</span>
                      <Button size="icon" variant="ghost" className="action-btn size-6" disabled={i === 0} onClick={() => moveMat(mod.id, i, -1)}><ArrowUp className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="action-btn size-6" disabled={i === mod.materialIds.length - 1} onClick={() => moveMat(mod.id, i, 1)}><ArrowDown className="size-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="action-btn size-6" onClick={() => removeMaterialFrom(mod.id, mid)}><X className="size-3.5" /></Button>
                    </div>
                  );
                })}
                {mod.materialIds.length === 0 && <p className="py-1 text-xs text-muted-foreground">Пока пусто.</p>}
                <div className="flex gap-2">
                  <select value={pendingMat} onChange={(e) => setPendingMat(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">Выберите материал...</option>
                    {available.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                  </select>
                  <Button size="sm" variant="outline" className="action-btn" onClick={() => addMaterialTo(mod.id, pendingMat)}><Plus />Добавить</Button>
                </div>
              </div>
            </div>
          ))}
          {modules.length === 0 && <p className="py-2 text-sm text-muted-foreground">Модулей пока нет — добавьте первый.</p>}
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
        <CardDescription>Продвинутые карточки показываются первыми в списке и получают значок «В топе». Тариф по плану: неделя — 179 ₽, месяц — 499 ₽.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {active ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            Активно до {until ? new Date(until).toLocaleDateString("ru-RU") : "—"}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Карточка пока не в топе.</p>
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