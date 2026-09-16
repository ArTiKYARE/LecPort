"use client";
import { useMemo } from "react";
import Link from "next/link";
import { BadgeCheck, Building2, ArrowRight } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function OrganizationsPage() {
  const { organizations, materials, subjects, loading } = useCatalog();

  const orgStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of materials) {
      if (m.organizationId) counts.set(m.organizationId, (counts.get(m.organizationId) ?? 0) + 1);
    }
    return organizations
      .map((o) => ({
        ...o,
        count: counts.get(o.id) ?? 0,
        subjects: new Set(materials.filter((m) => m.organizationId === o.id).map((m) => m.subjectId)).size,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ru"));
  }, [organizations, materials]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Building2 className="size-4 animate-pulse" />Загрузка организаций...</CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Продавцы платформы</h1>
        <p className="text-sm text-muted-foreground">
          Организации публикуют учебные материалы в каталоге. Выберите продавца, чтобы посмотреть его подборку.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgStats.map((o) => (
          <Card key={o.id} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {o.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-1.5 text-base">
                  <span className="truncate">{o.name}</span>
                  {o.verified && <BadgeCheck className="size-4 shrink-0 text-sky-500" />}
                </CardTitle>
                <CardDescription className="truncate">
                  {o.count} мат. {o.subjects > 0 ? `· ${o.subjects} предмета(ов)` : ""}
                </CardDescription>
              </div>
            </CardHeader>
            {o.description && <CardDescription className="px-6 pb-2 text-sm text-muted-foreground line-clamp-2">{o.description}</CardDescription>}
            <CardContent className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1"><Building2 className="size-3" />Продавец</Badge>
              <Link href={`/organization/${o.id}`} className="action-btn ml-auto inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium">
                Каталог<ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {orgStats.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Продавцов пока нет — материалы публикуются от имени платформы.</CardContent></Card>
      )}
    </div>
  );
}