"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, BookOpen, Pencil, Palette, RotateCcw, Trash2, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { type Subject } from "@/lib/types";
import { resolveSubjectColor } from "@/lib/sections";
import { useCatalog } from "@/lib/store";
import { useAuth, canEditMaterials, ROLE_LABELS } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardStyleEditor } from "@/components/admin/card-style-editor";
import { useToast } from "@/components/toast";

export default function AdminSubjectsPage() {
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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Предметы</h1>
          <p className="text-sm text-muted-foreground">Названия, порядок, оформление карточек (цвета и изображения). Разделы задают вид занятия, предметы — учебную дисциплину.</p>
        </div>
        <Badge variant="secondary" className="ml-auto">{ROLE_LABELS[role]}: {user.name}</Badge>
      </div>

      <SubjectsManager />
    </div>
  );
}

function SubjectsManager() {
  const {
    subjects, materials, subjectColors,
    addSubject, renameSubject, deleteSubject, setSubjectColor, clearSubjectColor, setSubjectCard, resetSubjectColors,
  } = useCatalog();
  const toast = useToast();
  const [newSubject, setNewSubject] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editorFor, setEditorFor] = useState<Subject | null>(null);
  const [deleteFor, setDeleteFor] = useState<Subject | null>(null);
  const [deleteMode, setDeleteMode] = useState<"move" | "delete">("move");
  const [deleteTargetId, setDeleteTargetId] = useState("");

  const countFor = (id: string) => materials.filter((m) => m.subjectId === id).length;

  const saveName = async (subj: Subject) => {
    const v = nameDraft.trim();
    if (!v || v === subj.name) {
      setEditingNameId(null);
      return;
    }
    await renameSubject(subj.id, v);
    logClient("subject_rename", `Предмет «${subj.name}» → «${v}»`);
    setEditingNameId(null);
    toast.success(`Предмет переименован в «${v}»`);
  };

  const createSubject = async (name: string) => {
    const v = name.trim();
    if (!v) return;
    const created = await addSubject(v);
    setNewSubject("");
    if (!created) {
      toast.error("Не удалось создать предмет");
      return;
    }
    setDeleteFor(null);
    setEditorFor({ ...created });
    toast.success(`Предмет «${created.name}» создан — сразу настройте его оформление`);
  };

  const startDelete = (subj: Subject) => {
    const targets = subjects.filter((s) => s.id !== subj.id);
    setDeleteTargetId(targets[0]?.id ?? "");
    setDeleteMode(targets.length ? "move" : "delete");
    setDeleteFor(subj);
    setEditorFor(null);
  };

  const confirmDelete = async () => {
    if (!deleteFor) return;
    if (deleteMode === "move" && deleteTargetId) {
      const target = subjects.find((s) => s.id === deleteTargetId);
      const n = await deleteSubject(deleteFor.id, { action: "move", moveToId: deleteTargetId });
      logClient("subject_delete", `Предмет «${deleteFor.name}» удалён, ${n} мат. перенесено в «${target?.name ?? deleteTargetId}»`);
      toast.success(`Предмет «${deleteFor.name}» удалён, материалов перенесено: ${n}.`);
    } else {
      const n = await deleteSubject(deleteFor.id, { action: "delete" });
      logClient("subject_delete", `Предмет «${deleteFor.name}» удалён вместе с материалами (${n})`);
      toast.success(`Предмет «${deleteFor.name}» удалён вместе с материалами (${n}).`);
    }
    setDeleteFor(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Список */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="size-4" />Предметы</CardTitle>
          <CardDescription>Нажмите «Оформление», чтобы выбрать цвета и изображение карточки для каталога.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Новый предмет" onKeyDown={(e) => { if (e.key === "Enter") createSubject(newSubject); }} />
            <Button variant="outline" className="action-btn" onClick={() => createSubject(newSubject)}>Добавить</Button>
          </div>
          {subjects.map((subj) => {
            const color = resolveSubjectColor(subjectColors, subj.id);
            return (
              <div key={subj.id} className={`overflow-hidden rounded-lg border px-3 py-2.5 ${editorFor?.id === subj.id ? "border-primary" : ""}`}>
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
                      className="h-8 min-w-0"
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
                        onClick={() => { setEditingNameId(subj.id); setNameDraft(subj.name); }}
                      >
                        <Pencil />Переименовать
                      </Button>
                      <Button size="sm" variant="outline" className="action-btn" onClick={() => { setDeleteFor(null); setEditorFor({ ...subj }); }}><Palette />Оформление</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="action-btn"
                        disabled={subjects.length <= 1}
                        title={subjects.length <= 1 ? "Нельзя удалить последний предмет" : "Удалить предмет"}
                        onClick={() => startDelete(subj)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => { resetSubjectColors(); toast.success("Цвета сброшены к автоматическим"); }} className="action-btn">
            <RotateCcw />Сбросить цвета к авто
          </Button>
        </CardContent>
      </Card>

      {/* Правая колонка: редактор / панель удаления / подсказка */}
      {editorFor ? (
        <CardStyleEditor
          title={`Оформление: ${editorFor.name}`}
          onExit={() => setEditorFor(null)}
          icon={<BookOpen className="size-4" />}
          footerLabel="Открыть предмет"
          cardName={editorFor.name}
          count={countFor(editorFor.id)}
          compact
          initialColor={resolveSubjectColor(subjectColors, editorFor.id)}
          initialCard={{ imageUrl: editorFor.card?.imageUrl ?? "", imageFit: editorFor.card?.imageFit ?? "cover", position: editorFor.card?.position ?? "center", glass: editorFor.card?.glass ?? true, icon: editorFor.card?.icon }}
          saveLabel="Сохранить оформление"
          extraAction={{ label: "Автоцвет", onClick: () => { clearSubjectColor(editorFor.id); setEditorFor(null); toast.success("Цвет сброшен к автоматическому"); } }}
          onSave={(color, card) => {
            setSubjectColor(editorFor.id, color);
            setSubjectCard(editorFor.id, card);
            logClient("subject_color", `Оформление предмета «${editorFor.name}»: фото=${card.imageUrl ? "да" : "нет"}, fit=${card.imageFit ?? "cover"}, позиция=${card.position ?? "center"}, стекло=${card.glass !== false}`);
            toast.success(`Оформление предмета «${editorFor.name}» сохранено`);
          }}
        />
      ) : deleteFor ? (
        <DeleteSubjectPanel
          subj={deleteFor}
          mode={deleteMode}
          targetId={deleteTargetId}
          onModeChange={setDeleteMode}
          onTargetChange={setDeleteTargetId}
          onConfirm={async () => { await confirmDelete(); }}
          onCancel={() => setDeleteFor(null)}
          targets={subjects.filter((s) => s.id !== deleteFor.id)}
          affectedCount={materials.filter((m) => m.subjectId === deleteFor.id).length}
        />
      ) : (
        <Card className="flex h-[280px] items-center justify-center text-sm text-muted-foreground xl:h-auto">
          <p>Выберите предмет в списке и нажмите «Оформление», чтобы настроить карточку для каталога.</p>
        </Card>
      )}
    </div>
  );
}

function DeleteSubjectPanel({ subj, mode, targetId, onModeChange, onTargetChange, onConfirm, onCancel, targets, affectedCount }: {
  subj: Subject;
  mode: "move" | "delete";
  targetId: string;
  onModeChange: (m: "move" | "delete") => void;
  onTargetChange: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  targets: Subject[];
  affectedCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Trash2 className="size-4 text-destructive" />Удалить «{subj.name}»?</CardTitle>
        <CardDescription>По предмету материалов: {affectedCount}. Выберите, что с ними делать.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {affectedCount > 0 ? (
          <div className="space-y-2">
            <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${mode === "move" ? "border-primary" : ""}`}>
              <input
                type="radio"
                name="del-subj-mode"
                checked={mode === "move"}
                onChange={() => onModeChange("move")}
                className="mt-1 size-4 accent-current"
              />
              <span className="flex-1">
                <span className="font-medium">Перенести в другой предмет</span>
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
                name="del-subj-mode"
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
          <p className="text-sm text-muted-foreground">По предмету нет материалов — его можно безопасно удалить.</p>
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