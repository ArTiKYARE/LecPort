import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { hasFullAccess } from "@/lib/server/users";
import { readCatalog } from "@/lib/server/catalog";
import { downloadUrlFor } from "@/lib/server/access";

export const dynamic = "force-dynamic";

/** Ссылка на контент материала с подписью (живёт 5 минут) — только с доступом. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  if (!hasFullAccess(user)) {
    return NextResponse.json({ error: "Нужна подписка для доступа к файлам" }, { status: 403 });
  }

  const { id } = await params;
  const cat = await readCatalog();
  const mat = cat.materials.find((m) => m.id === id);
  if (!mat) return NextResponse.json({ error: "Материал не найден" }, { status: 404 });

  const result: Record<string, string | null> = { url: null, driveUrl: null };
  if (mat.fileUrl) {
    result.url = mat.fileUrl.startsWith("http") ? mat.fileUrl : downloadUrlFor(mat.fileUrl.replace(/^\/?uploads\//, ""));
  }
  if (mat.driveUrl) result.driveUrl = mat.driveUrl;
  return NextResponse.json({ ok: true, ...result });
}