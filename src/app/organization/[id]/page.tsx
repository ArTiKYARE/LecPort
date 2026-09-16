"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BadgeCheck, Building2, ArrowLeft, ArrowRight, FileText, ExternalLink } from "lucide-react";
import { useCatalog } from "@/lib/store";
import { sectionSoftStyle } from "@/lib/sections";
import FavoriteButton from "@/components/FavoriteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OrganizationPage() {
  const { id } = useParams<{ id: string }>();
  const { organizations, materials, subjects, sections, sectionColors, loading } = useCatalog();

  const org = organizations.find((o) => o.id === id);

  const orgMaterials = useMemo(() => {
    if (!org) return [];
    return materials
      .filter((m) => m.organizationId === org.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [materials, org]);

  if (loading) {
    return (
      <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Building2 className="size-4 animate-pulse" />Загрузка...</CardContent></Card>
    );
  }

  if (!org) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Building2 className="size-10 text-muted-foreground/40" />
          <div>
            <p className="font-medium">Организация не найдена</p>
            <p className="text-sm text-muted-foreground">Возможно, она была удалена или ссылка устарела.</p>
          </div>
          <Button asChild variant="outline" className="action-btn"><Link href="/organizations"><ArrowLeft />Все продавцы</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const subjName = (sid: string) => subjects.find((s) => s.id === sid)?.name ?? sid;
  const typeName = (lid: string) => sections.find((t) => t.id === lid)?.name ?? lid;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="action-btn shrink-0">
        <Link href="/organizations"><ArrowLeft />Все продавцы</Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
          {org.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="truncate">{org.name}</span>
            {org.verified && <BadgeCheck className="size-6 shrink-0 text-sky-500" />}
          </h1>
          {org.description && <p className="text-sm text-muted-foreground">{org.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary" className="gap-1"><Building2 className="size-3" />Продавец</Badge>
            <span>{orgMaterials.length} материалов</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {orgMaterials.map((m) => (
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

      {orgMaterials.length === 0 && (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">У организации пока нет опубликованных материалов.</CardContent></Card>
      )}
    </div>
  );
}