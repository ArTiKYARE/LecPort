"use client";
import { useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, BookOpenText, PenLine, FlaskConical, FileText, ExternalLink,
  ArrowRight, ArrowLeft, ChevronRight, LayoutGrid, BookOpen,
} from "lucide-react";
import { type LessonType } from "@/lib/types";
import { useCatalog } from "@/lib/store";
import { sectionSoftStyle, resolveSubjectColor, contrastOn, glassEnabled, cardTextColor } from "@/lib/sections";
import { getIcon } from "@/lib/section-icons";
import FavoriteButton from "@/components/FavoriteButton";
import { CatalogCard } from "@/components/catalog-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TYPE_ICON: Record<string, typeof BookOpenText> = {
  lecture: BookOpenText,
  practice: PenLine,
  lab: FlaskConical,
};

const TYPE_DESC: Record<string, string> = {
  lecture: "Конспекты и презентации с теорией",
  practice: "Задачи с разбором и семинары",
  lab: "Методички и шаблоны отчётов",
};

const iconFor = (id: string) => TYPE_ICON[id] ?? BookOpen;
const descFor = (id: string) => TYPE_DESC[id] ?? "Учебные материалы раздела";

function CatalogInner() {
  const { materials, subjects, sections, organizations, sectionColors, subjectColors, loading } = useCatalog();
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type") as LessonType | null;
  const subjectId = params.get("subject");
  const q = params.get("q") ?? "";

  const orgName = (id?: string) => (id ? organizations.find((o) => o.id === id)?.name : "") ?? "";

  const validType = type && sections.some((s) => s.id === type) ? (type as LessonType) : null;
  const validSubject = subjectId && subjects.some((s) => s.id === subjectId) ? subjectId : null;

  const countByType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const mat of materials) m[mat.lessonType] = (m[mat.lessonType] ?? 0) + 1;
    return m;
  }, [materials]);

  const subjectsForType = useMemo(() => {
    if (!validType) return [];
    const counts = new Map<string, number>();
    for (const mat of materials) {
      if (mat.lessonType === validType) counts.set(mat.subjectId, (counts.get(mat.subjectId) ?? 0) + 1);
    }
    return subjects
      .map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [materials, subjects, validType]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (validType && m.lessonType !== validType) return false;
      if (validSubject && m.subjectId !== validSubject) return false;
      if (q && !(m.title + " " + m.description + " " + orgName(m.organizationId)).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [materials, validType, validSubject, q]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Search className="size-4 animate-pulse" />Загрузка каталога...</CardContent></Card>
    );
  }

  const setParam = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(qs ? `/catalog?${qs}` : "/catalog", { scroll: false });
  };

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const typeName = (id: string) => sections.find((t) => t.id === id)?.name ?? id;
  const subjColor = (id: string) => resolveSubjectColor(subjectColors, id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Каталог материалов</h1>
        <p className="text-sm text-muted-foreground">
          Шаг 1 — вид занятия, шаг 2 — предмет, шаг 3 — нужная лекция или работа.
        </p>
      </div>

      {/* Хлебные крошки */}
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <button onClick={() => setParam({ type: null, subject: null })} className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-foreground">
          <LayoutGrid className="size-3.5" />Каталог
        </button>
        {validType && (
          <>
            <ChevronRight className="size-3.5" />
            <button onClick={() => setParam({ subject: null })} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:text-foreground">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: sectionColors[validType] ?? "#64748b" }} />
              {typeName(validType)}
            </button>
          </>
        )}
        {validType && validSubject && (
          <>
            <ChevronRight className="size-3.5" />
            <span className="flex items-center gap-1.5 px-1 py-0.5 text-foreground">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: subjColor(validSubject) }} />
              {subjName(validSubject)}
            </span>
          </>
        )}
      </nav>

      {/* ШАГ 1: выбор вида занятия */}
      {!validType && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Шаг 1 — выберите раздел</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {sections.map((sec) => {
              const lt = sec.id;
              const Icon = getIcon(sec.card?.icon) ?? iconFor(lt);
              const color = sectionColors[lt] ?? "#64748b";
              const glass = glassEnabled(sec.card);
              const on = cardTextColor(sec.card, color);
              return (
                <CatalogCard
                  key={lt}
                  card={sec.card}
                  color={color}
                  icon={<Icon className="size-5" />}
                  title={typeName(lt)}
                  subtitle={`${countByType[lt] ?? 0} мат. · ${descFor(lt)}`}
                  footer={
                    <button
                      onClick={() => setParam({ type: lt, subject: null })}
                      className={`action-btn flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${glass ? "backdrop-blur-sm" : ""}`}
                      style={
                        glass
                          ? { backgroundColor: "rgba(255,255,255,0.92)", color: on === "#ffffff" ? color : "#0f172a" }
                          : { backgroundColor: on === "#ffffff" ? color : `${color}EE`, color: on === "#ffffff" ? "#ffffff" : "#0f172a" }
                      }
                    >
                      Выбрать раздел<ArrowRight className="size-4" />
                    </button>
                  }
                />
              );
            })}
          </div>

          {/* Быстрый поиск по всему каталогу */}
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setParam({ q: e.target.value })} placeholder="Или сразу найдите по названию..." className="pl-9" />
              </div>
              <Badge variant="secondary">Всего: {materials.length}</Badge>
            </CardContent>
          </Card>

          {q && (
            <MaterialGrid items={filteredMaterials} subjName={subjName} typeName={typeName} />
          )}
        </section>
      )}

      {/* ШАГ 2: выбор предмета внутри раздела */}
      {validType && !validSubject && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="action-btn" onClick={() => setParam({ type: null, subject: null })}>
              <ArrowLeft />Все разделы
            </Button>
            <h2 className="text-lg font-semibold">{typeName(validType)} — выберите предмет</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectsForType.map((s) => {
              const sc = subjColor(s.id);
              const glass = glassEnabled(s.card);
              const on = cardTextColor(s.card, sc);
              const SubjIcon = getIcon(s.card?.icon) ?? BookOpen;
              return (
                <div key={s.id} className={s.count === 0 ? "opacity-60" : ""}>
                  <CatalogCard
                    compact
                    card={s.card}
                    color={sc}
                    icon={<SubjIcon className="size-4" />}
                    title={s.name}
                    subtitle={`${s.count} мат.`}
                    footer={
                      <button
                        disabled={s.count === 0}
                        onClick={() => setParam({ subject: s.id })}
                        className={`action-btn flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:pointer-events-none disabled:opacity-50 ${glass ? "backdrop-blur-sm" : ""}`}
                        style={
                          glass
                            ? { backgroundColor: "rgba(255,255,255,0.92)", color: on === "#ffffff" ? sc : "#0f172a" }
                            : { backgroundColor: on === "#ffffff" ? sc : `${sc}EE`, color: on === "#ffffff" ? "#ffffff" : "#0f172a" }
                        }
                      >
                        Открыть предмет
                      </button>
                    }
                  />
                </div>
              );
            })}
          </div>
          {subjectsForType.every((s) => s.count === 0) && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">В разделе пока нет материалов.</CardContent></Card>
          )}
        </section>
      )}

      {/* ШАГ 3: список материалов предмета */}
      {validType && validSubject && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="action-btn" onClick={() => setParam({ subject: null })}>
              <ArrowLeft />{typeName(validType)}: все предметы
            </Button>
          </div>
          <div
            className="relative overflow-hidden rounded-lg px-4 py-3"
            style={{
              background: `linear-gradient(135deg, ${sectionColors[validType] ?? "#64748b"}, ${(sectionColors[validType] ?? "#64748b")}CC)`,
              border: "1px solid rgba(255,255,255,0.25)",
              color: contrastOn(sectionColors[validType] ?? "#64748b"),
            }}
          >
            <div aria-hidden className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="size-3 shrink-0 rounded-full bg-white/90" style={{ boxShadow: `0 0 0 3px ${subjColor(validSubject)}55` }} title={subjName(validSubject)} />
              <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
                {typeName(validType)} · {subjName(validSubject)}
              </h2>
              <span className="shrink-0 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                {filteredMaterials.length} мат.
              </span>
            </div>
          </div>
          <Card>
            <CardContent className="pt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setParam({ q: e.target.value })} placeholder="Найти нужную лекцию..." className="pl-9" />
              </div>
            </CardContent>
          </Card>
          <MaterialGrid items={filteredMaterials} subjName={subjName} typeName={typeName} />
        </section>
      )}
    </div>
  );
}

function MaterialGrid({ items, subjName, typeName }: {
  items: ReturnType<typeof useCatalog>["materials"];
  subjName: (id: string) => string;
  typeName: (id: string) => string;
}) {
  const { sectionColors, organizations } = useCatalog();
  const orgName = (id?: string) => (id ? organizations.find((o) => o.id === id)?.name : "") ?? "";
  if (!items.length) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Ничего не найдено. Попробуйте другой запрос.</CardContent></Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((m) => (
        <Card key={m.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{subjName(m.subjectId)}</Badge>
              <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType] ?? "#64748b")}>{typeName(m.lessonType)}</Badge>
              {m.price != null && m.price > 0 && <Badge variant="price">{m.price} ₽</Badge>}
              {m.price != null && m.price === 0 && <Badge variant="outline">Бесплатно</Badge>}
            </div>
            <CardTitle className="pt-2 text-base leading-snug">{m.title}</CardTitle>
            <CardDescription className="line-clamp-2">{m.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2 pt-0 text-xs text-muted-foreground">
            {m.fileName && <span className="inline-flex items-center gap-1"><FileText className="size-3" />{m.fileName}</span>}
            {m.hasDrive && <span className="inline-flex items-center gap-1"><ExternalLink className="size-3" />Google Диск</span>}
            {m.organizationId && orgName(m.organizationId) && (
              <Link href={`/organization/${m.organizationId}`} className="inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium text-primary hover:underline">
                {orgName(m.organizationId)}
              </Link>
            )}
            <div className="ml-auto flex items-center gap-2">
              <FavoriteButton materialId={m.id} />
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/material/${m.id}`}>Открыть<ArrowRight /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Загрузка каталога...</div>}>
      <CatalogInner />
    </Suspense>
  );
}
