import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getSessionUser } from '@/lib/server/session';
import { logAudit } from '@/lib/server/audit';

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

const ALLOWED = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"];
const MAX_BYTES = 15 * 1024 * 1024;

/** Загрузка картинки для карточки каталога (раздела/предмета). Только модератор и админ. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return NextResponse.json({ error: 'Загрузка доступна модератору и администратору' }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json({ error: 'Разрешены изображения PNG/JPG/WEBP/GIF/SVG/AVIF' }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Файл больше 15 МБ' }, { status: 400 });
    }
    const buffer = Buffer.from(bytes);
    const dir = path.join(process.cwd(), 'data', 'card-images');
    await mkdir(dir, { recursive: true });
    const safe = `${Date.now()}-${file.name.replace(/[^a-zA-Zа-яА-Я0-9_.-]/g, '_')}`;
    await writeFile(path.join(dir, safe), buffer);

    await logAudit({
      userId: user.id,
      email: user.email,
      userName: user.name,
      role: user.role,
      action: "section_color",
      details: `Загрузка изображения карточки: ${file.name}`,
      ip: getIp(req),
    });

    return NextResponse.json({ url: `/card-image/${safe}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}