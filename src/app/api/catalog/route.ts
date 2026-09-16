import { NextResponse } from "next/server";
import { readCatalog, enrichOwners, type CatalogData } from "@/lib/server/catalog";
import type { Material } from "@/lib/types";
import { getSessionUser } from "@/lib/server/session";
import { hasFullAccess, readUsers } from "@/lib/server/users";

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
  const users = await readUsers();
  const enriched = enrichOwners(cat, users);
  return NextResponse.json({
    ok: true,
    catalog: {
      sections: enriched.sections,
      subjects: enriched.subjects,
      sectionColors: enriched.sectionColors,
      subjectColors: enriched.subjectColors,
      organizations: enriched.organizations,
      courses: enriched.courses,
      services: enriched.services,
      reviews: enriched.reviews,
      materials: publicMaterials(enriched, full),
    },
  });
}