"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, LayoutGrid, Pencil, Palette, RotateCcw, Trash2, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { type Section } from "@/lib/types";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, ROLE_LABELS } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardStyleEditor } from "@/components/admin/card-style-editor";
import { useToast } from "@/components/toast";

export default function AdminSectionsPage() {
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Разделы каталога</h1>
          <p className="text-sm text-muted-foreground">Названия, порядок, оформление карточек (цвета и изображения). Меню в каталоге формируется из разделов.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABELS[role]}: {user.name}</Badge>
      </div>

      <SectionsManager />
    </div>
  );
}

function SectionsManager() {
  const {
    sections, materials, sectionColors,
    addSection, renameSection, deleteSection, setSectionColor, setSectionCard, resetSectionColors,
  } = useCatalog();
  const toast = useToast();
  const [newSection, setNewSection] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editorFor, setEditorFor] = useState<Section | null>(null);
  const [deleteFor, setDeleteFor] = useState<Section | null>(null);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete">("move");
  const [deleteTargetId, setDeleteTargetId] = useState("");

  const countFor = (id: string) => materials.filter((m) => m.lessonType === id).length;

  const saveName = async (sec: Section) => {
    const v = nameDraft.trim();
    if (!v || v === sec.name) {
      setEditingNameId(null);
      return;
    }
    await renameSection(sec.id, v);
    logClient("section_rename", `Раздел «${sec.name}» → «${v}»`);
    setEditingNameId(null);
    toast.success(`Раздел переименован в «${v}»`);
  };

  const createSection = async (name: string) => {
    const v = name.trim();
    if (!v) return;
    const created = await addSection(v);
    setNewSection("");
    if (!created) {
      toast.error("Не удалось создать раздел");
      return;
    }
    setDeleteFor(null);
    setEditorFor({ ...created });
    toast.success(`Раздел «${created.name}» создан — сразу настройте его оформление`);
  };

  const startDelete = (sec: Section) => {
    const targets = sections.filter((s) => s.id !== sec.id);
    setDeleteTargetId(targets[0]?.id ?? "");
    setDeleteMode(targets.length ? "move" : "delete");
    setDeleteFor(sec);
    setEditorFor(null);
  };

  const confirmDelete = async () => {
    if (!deleteFor) return;
    if (deleteMode === "move" && deleteTargetId) {
      const target = sections.find((s) => s.id === deleteTargetId);
      const n = await deleteSection(deleteFor.id, { action: "move", moveToId: deleteTargetId });
      logClient("section_delete", `Раздел «${deleteFor.name}» удалён, ${n} мат. перенесено в «${target?.name ?? deleteTargetId}»`);
      toast.success(`Раздел «${deleteFor.name}» удалён, материалов перенесено: ${n}.`);
    } else {
      const n = await deleteSection(deleteFor.id, { action: "delete" });
      logClient("section_delete", `Раздел «${deleteFor.name}» удалён вместе с материалами (${n})`);
      toast.success(`Раздел «${deleteFor.name}» удалён вместе с материалами (${n}).`);
    }
    setDeleteFor(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Список */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><LayoutGrid className="size-4" />Разделы</CardTitle>
          <CardDescription>Нажмите «Оформление», чтобы выбрать цвета и изображение карточки для каталога.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="Новый раздел" onKeyDown={(e) => { if (e.key === "Enter") createSection(newSection); }} />
            <Button variant="outline" className="action-btn" onClick={() => createSection(newSection)}>Добавить</Button>
          </div>
          {sections.map((sec) => {
            const color = sectionColors[sec.id] ?? "#64748b";
            return (
              <div key={sec.id} className={`overflow-hidden rounded-lg border px-3 py-2.5 ${editorFor?.id === sec.id ? "border-primary" : ""}`}>
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
                      className="h-8 min-w-0"
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
                        onClick={() => { setEditingNameId(sec.id); setNameDraft(sec.name); }}
                      >
                        <Pencil />Переименовать
                      </Button>
                      <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setEditorFor({ ...sec }); }}><Palette />Оформление</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="action-btn"
                        disabled={sections.length <= 1}
                        title={sections.length <= 1 ? "Нельзя удалить последний раздел" : "Удалить раздел"}
                        onClick={() => startDelete(sec)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => { resetSectionColors(); toast.success("Цвета сброшены к стандартным"); }} className="action-btn">
            <RotateCcw />Сбросить цвета
          </Button>
        </CardContent>
      </Card>

      {/* Правая колонка: редактор / панель удаления / подсказка */}
      {editorFor ? (
        <CardStyleEditor
          title={`Оформление: ${editorFor.name}`}
          onExit={() => setEditorFor(null)}
          icon={<LayoutGrid className="size-5" />}
          footerLabel="Выбрать раздел"
          cardName={editorFor.name}
          count={countFor(editorFor.id)}
          initialColor={sectionColors[editorFor.id] ?? "#64748b"}
          initialCard={{ imageUrl: editorFor.card?.imageUrl ?? "", imageFit: editorFor.card?.imageFit ?? "cover", position: editorFor.card?.position ?? "center", glass: editorFor.card?.glass ?? true, icon: editorFor.card?.icon }}
          saveLabel="Сохранить оформление"
          onSave={(color, card) => {
            setSectionColor(editorFor.id, color);
            setSectionCard(editorFor.id, card);
            logClient("section_color", `Оформление раздела «${editorFor.name}»: фото=${card.imageUrl ? "да" : "нет"}, fit=${card.imageFit ?? "cover"}, позиция=${card.position ?? "center"}, стекло=${card.glass !== false}`);
            toast.success(`Оформление раздела «${editorFor.name}» сохранено`);
          }}
        />
      ) : deleteFor ? (
        <DeleteSectionPanel
          sec={deleteFor}
          mode={deleteMode}
          targetId={deleteTargetId}
          onModeChange={setDeleteMode}
          onTargetChange={setDeleteTargetId}
          onConfirm={async () => { await confirmDelete(); }}
          onCancel={() => setDeleteFor(null)}
          targets={sections.filter((s) => s.id !== deleteFor.id)}
          affectedCount={materials.filter((m) => m.lessonType === deleteFor.id).length}
        />
      ) : (
        <Card className="flex h-[280px] items-center justify-center text-sm text-muted-foreground xl:h-auto">
          <p>Выберите раздел в списке и нажмите «Оформление», чтобы настроить карточку для каталога.</p>
        </Card>
      )}
    </div>
  );
}

function DeleteSectionPanel({ sec, mode, targetId, onModeChange, onTargetChange, onConfirm, onCancel, targets, affectedCount }: {
  sec: Section;
  mode: "move" | "delete";
  targetId: string;
  onModeChange: (m: "move" | "delete") => void;
  onTargetChange: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  targets: Section[];
  affectedCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Trash2 className="size-4 text-destructive" />Удалить «{sec.name}»?</CardTitle>
        <CardDescription>В разделе материалов: {affectedCount}. Выберите, что с ними делать.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {affectedCount > 0 ? (
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "move" ? "border-primary" : ""}`}>
              <input
                type="radio"
                name="del-mode"
                checked={mode === "move"}
                onChange={() => onModeChange("move")}
                className="mt-1 size-4 accent-current"
              />
              <span className="flex-1">
                <span className="font-medium">Перенести в другой раздел</span>
                <select
                  value={targetId}
                  onChange={(e) => onTargetChange(e.target.value)}
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
                onChange={() => onModeChange("delete")}
                className="mt-1 size-4 accent-current"
              />
              <span>
                <span className="font-medium">Удалить вместе с материалами ({affectedCount})</span>
                <span className="block text-xs text-muted-foreground">Файлы останутся на диске, но исчезнут из каталога.</span>
              </span>
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Раздел пуст — его можно безопасно удалить.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" onClick={onConfirm} disabled={mode === "move" && !targetId} className="action-btn">
            <Trash2 />{affectedCount > 0 && mode === "move" ? "Перенести и удалить" : "Удалить"}
          </Button>
          <Button variant="outline" onClick={onCancel} className="action-btn"><X />Отмена</Button>
        </div>
      </CardContent>
    </Card>
  );
}