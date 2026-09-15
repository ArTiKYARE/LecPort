"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Download, ExternalLink, Eye, CheckCircle2, FileText } from "lucide-react";
import type { Material } from "@/lib/types";
import { getMaterialById, useCatalog } from "@/lib/store";
import { useAuth, canAccessFull } from "@/lib/auth";
import { logClient } from "@/lib/audit-client";
import { sectionSoftStyle } from "@/lib/sections";
import FavoriteButton from "@/components/FavoriteButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function MaterialPage() {
  const params = useParams<{ id: string }>();
  const [mat, setMat] = useState<Material | undefined>(undefined);
  const { subjects, sections, sectionColors } = useCatalog();
  const { role, hasSubscription } = useAuth();
  const full = canAccessFull(role, hasSubscription);

  useEffect(() => {
    if (params?.id) {
      setMat(getMaterialById(params.id));
      logClient("material_view", `Открытие материала: ${params.id}`);
    }
  }, [params?.id]);

  if (!mat) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Материал не найден. <Link href="/catalog" className="underline">Вернуться в каталог</Link>
        </CardContent>
      </Card>
    );
  }

  const subj = subjects.find((s) => s.id === mat.subjectId)?.name ?? mat.subjectId;
  const ltype = sections.find((t) => t.id === mat.lessonType)?.name ?? mat.lessonType;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/catalog"><ArrowLeft />Каталог</Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{subj}</Badge>
            <Badge variant="outline" style={sectionSoftStyle(sectionColors[mat.lessonType])}>{ltype}</Badge>
            {full ? <Badge variant="success"><CheckCircle2 />Полный доступ</Badge> : <Badge variant="warning"><Lock />Только превью</Badge>}
            <span className="ml-auto"><FavoriteButton materialId={mat.id} /></span>
          </div>
          <CardTitle className="text-2xl leading-tight">{mat.title}</CardTitle>
          <CardDescription className="text-base">{mat.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Eye className="size-4" />Превью для гостей</div>
            <p className="mt-2 text-sm text-muted-foreground">{mat.previewText ?? "Превью пока не добавлено. Полное содержимое доступно по подписке."}</p>
          </div>

          {full ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="size-4" />Полный доступ</div>
              <div className="mt-3 flex flex-col gap-2">
                {mat.fileUrl && (
                  <Button variant="outline" size="sm" className="w-fit" asChild>
                    <a href={mat.fileUrl} download onClick={() => logClient("material_download", `Скачивание: ${mat.title}`)}><Download />Скачать: {mat.fileName}</a>
                  </Button>
                )}
                {mat.fileName && !mat.fileUrl && (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" />{mat.fileName}</span>
                )}
                {mat.driveUrl && (
                  <Button variant="outline" size="sm" className="w-fit" asChild>
                    <a href={mat.driveUrl} target="_blank" rel="noreferrer"><ExternalLink />Открыть Google Диск</a>
                  </Button>
                )}
                {!mat.fileUrl && !mat.driveUrl && !mat.fileName && (
                  <span className="text-sm text-muted-foreground">Файл пока не прикреплён администратором.</span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4" />Файл доступен по подписке</div>
              <p className="mt-1 text-sm text-muted-foreground">Войдите в аккаунт и оформите подписку, чтобы скачать файл и открыть ссылку на Диск.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" asChild><Link href="/subscription">Выбрать тариф</Link></Button>
                <Button variant="outline" size="sm" asChild><Link href="/login">Войти</Link></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
