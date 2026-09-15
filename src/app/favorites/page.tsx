"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, StickyNote, Trash2, Check, ArrowRight, Loader2 } from "lucide-react";
import { useCatalog, useFavorites } from "@/lib/store";
import { sectionSoftStyle } from "@/lib/sections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function NoteEditor({ materialId, initial }: { materialId: string; initial: string }) {
  const { setNote } = useFavorites();
  const [text, setText] = useState(initial);
  const [savedTick, setSavedTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setText(initial); }, [initial, materialId]);

  const onChange = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setNote(materialId, v);
      setSavedTick((t) => t + 1);
    }, 600);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <StickyNote className="size-3.5" />Моя заметка
        {savedTick > 0 && (
          <span key={savedTick} className="animate-save-flash inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" />Сохранено
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Конспект, вопросы к занятию, формулы..."
        rows={3}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export default function FavoritesPage() {
  const { materials, subjects, sections, sectionColors } = useCatalog();
  const { favorites, notes, removeFavorite, ready } = useFavorites();

  if (!ready) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Загрузка избранного...</CardContent></Card>
    );
  }

  const items = favorites
    .map((id) => materials.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
  const typeName = (id: string) => sections.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
          <Heart className="size-6" />Избранное
        </h1>
        <p className="text-sm text-muted-foreground">
          Отложенные материалы и личные заметки к ним. Заметки сохраняются автоматически.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <Heart className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Пока пусто. Отмечайте материалы сердечком в каталоге.</p>
            <Button variant="outline" asChild><Link href="/catalog">Перейти в каталог</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{subjName(m.subjectId)}</Badge>
                  <Badge variant="outline" style={sectionSoftStyle(sectionColors[m.lessonType])}>{typeName(m.lessonType)}</Badge>
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/material/${m.id}`}>Открыть<ArrowRight /></Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeFavorite(m.id)} title="Убрать из избранного" className="action-btn">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <CardTitle className="pt-2 text-base">{m.title}</CardTitle>
                <CardDescription className="line-clamp-2">{m.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <NoteEditor materialId={m.id} initial={notes[m.id] ?? ""} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
