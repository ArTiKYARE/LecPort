import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSessionUser } from "@/lib/server/session";
import { hasFullAccess } from "@/lib/server/users";
import { verifyDownload, watermarkPdf, stampOfficeMeta, watermarkTxt } from "@/lib/server/access";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });

  const { name } = await params;
  const decoded = decodeURIComponent(name);

  // Path traversal protection
  if (!decoded || decoded.includes("..") || decoded.startsWith("/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = hasFullAccess(user) && (user.role === "admin" || user.role === "moderator");
  const canAccess = hasFullAccess(user);

  if (!canAccess) {
    return NextResponse.json({ error: "Нужна подписка" }, { status: 403 });
  }

  // Для обычных покупателей ссылка должна быть подписанной и не протухшей.
  if (!isStaff) {
    const exp = Number(req.nextUrl.searchParams.get("exp") ?? NaN);
    const sig = String(req.nextUrl.searchParams.get("sig") ?? "");
    if (!verifyDownload(decoded, exp, sig)) {
      return NextResponse.json({ error: "Ссылка устарела" }, { status: 403 });
    }
  }

  const filePath = path.join(process.cwd(), "data", "uploads", decoded);
  let buf: Buffer;
  try {
    buf = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  // Водяные знаки — только покупателям. Сотрудники получают оригинал.
  if (!isStaff) {
    const wm = { id: user.id, name: user.name, email: user.email };
    try {
      if (ext === ".pdf") buf = await watermarkPdf(buf, wm);
      else if (ext === ".docx" || ext === ".pptx") buf = stampOfficeMeta(buf, wm);
      else if (ext === ".txt") buf = watermarkTxt(buf, wm);
    } catch (e: any) {
      console.error("[uploads] watermark failed:", e.message);
    }
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(decoded)}"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}