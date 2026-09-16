import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { readCatalog, writeCatalog, recalcServiceRating } from "@/lib/server/catalog";
import type { Review } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST — любой авторизованный пользователь оставляет отзыв
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const targetType = String(body?.targetType ?? "") as Review["targetType"];
  const targetId = String(body?.targetId ?? "");
  const rating = Math.max(1, Math.min(5, Number(body?.rating) || 5));
  if (!targetId || !["service", "course", "material"].includes(targetType)) {
    return NextResponse.json({ error: "Некорректный объект отзыва" }, { status: 400 });
  }

  const cat = await readCatalog();
  const targetExists =
    targetType === "service" ? cat.services.some((s) => s.id === targetId) :
    targetType === "course" ? cat.courses.some((c) => c.id === targetId) :
    cat.materials.some((m) => m.id === targetId);
  if (!targetExists) return NextResponse.json({ error: "Объект не найден" }, { status: 404 });

  const already = cat.reviews.find((r) => r.targetType === targetType && r.targetId === targetId && r.authorId === me.id);
  if (already) {
    // Пользователь уже оставлял отзыв — обновляем вместо дубликата.
    already.rating = rating;
    already.text = String(body.text ?? "").trim() || undefined;
  } else {
    const review: Review = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetType,
      targetId,
      authorId: me.id,
      authorName: me.username ?? me.name ?? "Аноним",
      rating,
      text: String(body.text ?? "").trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    cat.reviews = [...cat.reviews, review];
  }
  if (targetType === "service") recalcServiceRating(cat, targetId);
  await writeCatalog(cat);
  return NextResponse.json({ ok: true });
}

// DELETE — автор отзыва или модератор/админ
export async function DELETE(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Нет id отзыва" }, { status: 400 });

  const cat = await readCatalog();
  const review = cat.reviews.find((r) => r.id === id);
  if (!review) return NextResponse.json({ error: "Отзыв не найден" }, { status: 404 });
  if (review.authorId !== me.id && me.role !== "admin" && me.role !== "moderator") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  cat.reviews = cat.reviews.filter((r) => r.id !== id);
  if (review.targetType === "service") recalcServiceRating(cat, review.targetId);
  await writeCatalog(cat);
  return NextResponse.json({ ok: true });
}