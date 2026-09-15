import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Material, Subject, Section, SectionColors } from "@/lib/types";
import { SECTIONS_SEED, SECTION_COLORS_DEFAULT, MATERIALS_SEED, SUBJECTS_SEED } from "@/lib/types";

export type CatalogData = {
  sections: Section[];
  subjects: Subject[];
  materials: Material[];
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