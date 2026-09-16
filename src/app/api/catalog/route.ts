import { NextResponse } from "next/server";
import { readCatalog, type CatalogData } from "@/lib/server/catalog";
import type { Material } from "@/lib/types";
import { getSessionUser } from "@/lib/server/session";
import { hasFullAccess } from "@/lib/server/users";

export const dynamic = "force-dynamic";

/** Публичная версия материала: ссылки на файлы видны только тем, у кого есть доступ. */
export function publicMaterials(cat: CatalogData, full: boolean): Material[] {
  return cat.materials.map((m) => {
    const pub = { ...m, hasFile: Boolean(m.fileUrl), hasDrive: Boolean(m.driveUrl) };
    if (full) return pub;
    pub.fileUrl = undefined;
    pub.driveUrl = undefined;
    return pub;
  });
}

export async function GET() {
  const cat = await readCatalog();
  const user = await getSessionUser();
  const full = user ? hasFullAccess(user) : false;
  return NextResponse.json({
    ok: true,
    catalog: {
      sections: cat.sections,
      subjects: cat.subjects,
      sectionColors: cat.sectionColors,
      subjectColors: cat.subjectColors,
      organizations: cat.organizations,
      materials: publicMaterials(cat, full),
    },
  });
}