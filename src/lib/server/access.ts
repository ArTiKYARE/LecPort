import crypto from "crypto";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { unzipSync, zipSync, strToU8, strFromU8 } from "fflate";
import type { PublicUser } from "@/lib/server/users";

const SECRET = process.env.AUTH_SECRET || "lecport-dev-secret-change-me";

export type WatermarkUser = Pick<PublicUser, "id" | "name" | "email">;

/** Время жизни подписанной ссылки, мс (5 минут). */
const TTL_MS = 5 * 60 * 1000;

export function signDownload(name: string, expEpochMs: number): string {
  return crypto.createHmac("sha256", SECRET).update(`${name}:${expEpochMs}`).digest("base64url");
}

export function verifyDownload(name: string, expEpochMs: number, sig: string): boolean {
  if (!sig || !Number.isFinite(expEpochMs)) return false;
  if (Date.now() > expEpochMs) return false;
  const expected = signDownload(name, expEpochMs);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Параметры ссылки на скачивание, просроченной через 5 минут. */
export function downloadUrlFor(name: string, base = "/uploads"): string {
  const exp = Date.now() + TTL_MS;
  const sig = signDownload(name, exp);
  return `${base}/${encodeURIComponent(name)}?exp=${exp}&sig=${sig}`;
}

function marker(w: WatermarkUser) {
  return `lecport-wm:${w.id}`;
}

/** Видимый водяной знак (имя/email) на каждой странице PDF. */
export async function watermarkPdf(buf: Buffer, w: WatermarkUser): Promise<Buffer> {
  const pdf = await PDFDocument.load(buf);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const text = `${w.name} — ${w.email}`;
  const mark = marker(w);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const fs = Math.max(10, Math.min(width, height) / 26);
    page.drawText(text, {
      x: width / 2 - 10,
      y: height / 2 - fs / 2,
      size: fs,
      font: helv,
      color: rgb(0.45, 0.45, 0.5),
      opacity: 0.22,
      rotate: degrees(-35),
    });
    page.drawText(mark, { x: 8, y: 8, size: 6, font: helv, color: rgb(0.6, 0.6, 0.65), opacity: 0.3 });
  }
  pdf.setTitle(`${w.email} — LecPort`);
  pdf.setKeywords([mark, w.email]);
  return Buffer.from(await pdf.save());
}

/** Невидимый знак в метаданных DOCX/PPTX (docProps/core.xml). */
export function stampOfficeMeta(buf: Buffer, w: WatermarkUser): Buffer {
  const files = unzipSync(new Uint8Array(buf));
  const coreName = "docProps/core.xml";
  const core = files[coreName] ? strFromU8(files[coreName]) : "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:subject/></cp:coreProperties>";
  const tag = `<cp:keywords>${marker(w)};${w.email}</cp:keywords>`;
  const nextCore = core.includes("<cp:keywords>")
    ? core.replace(/<cp:keywords>.*?<\/cp:keywords>/, tag)
    : core.replace("</cp:coreProperties>", `${tag}</cp:coreProperties>`);
  files[coreName] = strToU8(nextCore);
  return Buffer.from(zipSync(files));
}

/** Видимый заголовок для текстовых файлов. */
export function watermarkTxt(buf: Buffer, w: WatermarkUser): Buffer {
  const head = `==========\nЛицензионная копия для ${w.name} (${w.email}).\nПередача и пересылка нарушают условия использования — п.5 правил.\n==========\n\n`;
  return Buffer.concat([Buffer.from(head), buf]);
}

/** Да/нет — нужно ли водяниками модифицировать файл для этого пользователя. */
export function watermarkForUser(w: WatermarkUser): { name: string; email: string; id: string } {
  return { name: w.name ?? "", email: w.email, id: w.id };
}