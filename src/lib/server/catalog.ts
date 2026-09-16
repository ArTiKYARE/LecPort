import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Material, Subject, Section, SectionColors, Organization, Course, Service, Review } from "@/lib/types";
import { SECTIONS_SEED, SECTION_COLORS_DEFAULT, MATERIALS_SEED, SUBJECTS_SEED, ORGANIZATION_SEED } from "@/lib/types";
import { ownerPremiumActive, type UserRecord } from "@/lib/server/users";

export type CatalogData = {
  sections: Section[];
  subjects: Subject[];
  materials: Material[];
  organizations: Organization[];
  courses: Course[];
  services: Service[];
  reviews: Review[];
  sectionColors: SectionColors;
  subjectColors: Record<string, string>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "catalog.json");

export function seedCatalog(): CatalogData {
  return {
    sections: SECTIONS_SEED,
    subjects: SUBJECTS_SEED,
    materials: MATERIALS_SEED,
    organizations: ORGANIZATION_SEED,
    courses: [],
    services: [],
    reviews: [],
    sectionColors: { ...SECTION_COLORS_DEFAULT },
    subjectColors: {},
  };
}

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(FILE, "utf-8");
  } catch {
    await writeFile(FILE, JSON.stringify(seedCatalog(), null, 2), "utf-8");
  }
}

/** Добавить дефолты для новых полей Organization (обратная совместимость со старыми данными). */
function normalizeOrg(o: any): Organization {
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    avatar: o.avatar,
    ownerId: o.ownerId,
    verified: o.verified,
    membership: o.membership === "request" ? "request" : "open",
    members: Array.isArray(o.members) ? o.members : [],
    joinRequests: Array.isArray(o.joinRequests) ? o.joinRequests : [],
    sections: Array.isArray(o.sections) ? o.sections : [],
    news: Array.isArray(o.news) ? o.news : [],
    createdAt: o.createdAt ?? new Date().toISOString(),
  };
}

export async function readCatalog(): Promise<CatalogData> {
  await ensureFile();
  const raw = await readFile(FILE, "utf-8");
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== "object" || !Array.isArray(j.materials)) return seedCatalog();
    return {
      sections: Array.isArray(j.sections) ? j.sections : seedCatalog().sections,
      subjects: Array.isArray(j.subjects) ? j.subjects : seedCatalog().subjects,
      materials: j.materials,
      organizations: Array.isArray(j.organizations) ? j.organizations.map(normalizeOrg) : [],
      courses: Array.isArray(j.courses) ? j.courses : [],
      services: Array.isArray(j.services) ? j.services : [],
      reviews: Array.isArray(j.reviews) ? j.reviews : [],
      sectionColors: { ...SECTION_COLORS_DEFAULT, ...(j.sectionColors ?? {}) },
      subjectColors: typeof j.subjectColors === "object" && j.subjectColors ? j.subjectColors : {},
    };
  } catch {
    return seedCatalog();
  }
}

export async function writeCatalog(data: CatalogData) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(data, null, 2), "utf-8");
}

/** Пересчитать рейтинг и количество отзывов для конкретной услуги. */
export function recalcServiceRating(cat: CatalogData, serviceId: string) {
  const revs = cat.reviews.filter((r) => r.targetType === "service" && r.targetId === serviceId);
  const svc = cat.services.find((s) => s.id === serviceId);
  if (!svc) return;
  svc.reviewCount = revs.length;
  svc.rating = revs.length ? Math.round((revs.reduce((sum, r) => sum + r.rating, 0) / revs.length) * 10) / 10 : 0;
}

/** Проставить на каждом сообществе флаг «подписка владельца активна» (для UI заморозки). */
export function enrichOwners(cat: CatalogData, users: UserRecord[]): CatalogData {
  return {
    ...cat,
    organizations: cat.organizations.map((o) => ({ ...o, ownerPremiumActive: ownerPremiumActive(o.ownerId, users) })),
  };
}