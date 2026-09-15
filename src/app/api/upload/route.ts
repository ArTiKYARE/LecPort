import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getSessionUser } from '@/lib/server/session';
import { logAudit } from '@/lib/server/audit';

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "moderator")) {
    return NextResponse.json({ error: 'Загрузка доступна модератору и администратору' }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

    const allowed = ['.pdf', '.docx', '.pptx', '.doc', '.ppt', '.txt'];
    const ext = path.extname(file.name).toLowerCase();
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Разрешены только PDF/DOCX/PPTX' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(dir, { recursive: true });
    const safe = `${Date.now()}-${file.name.replace(/[^a-zA-Zа-яА-Я0-9_.-]/g, '_')}`;
    await writeFile(path.join(dir, safe), buffer);

    await logAudit({
      userId: user.id,
      email: user.email,
      userName: user.name,
      role: user.role,
      action: "material_create",
      details: `Загрузка файла: ${file.name}`,
      ip: getIp(req),
    });

    return NextResponse.json({ url: `/uploads/${safe}`, name: file.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
