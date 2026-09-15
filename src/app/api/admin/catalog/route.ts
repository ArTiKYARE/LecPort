import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { readCatalog, writeCatalog, type CatalogData } from "@/lib/server/catalog";
import type { Material, Section, Subject } from "@/lib/types";
import { SECTION_COLORS_DEFAULT } from "@/lib/types";

export const dynamic = "force-dynamic";

function isAdminOrMod(role: string) {
  return role === "admin" || role === "moderator";
}

function ok(cat: CatalogData) {
  return NextResponse.json({ ok: true, catalog: cat });
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

const slugify = (name: string) => name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-");

/**
 * POST /api/admin/catalog — все изменения каталога (разделы, предметы,
 * материалы, цвета). Доступно администратору и модератору.
 * Тело: { action, ...payload }. В ответ отдаётся полный каталог.
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || !isAdminOrMod(me.role)) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.action !== "string") {
    return bad("Некорректный запрос");
  }

  const cat = await readCatalog();
  const action = body.action;

  switch (action) {
    case "addSection": {
      const name = String(body.name ?? "").trim();
      if (!name) return bad("Название раздела не может быть пустым");
      const newSection: Section = { id: `${slugify(name)}-${Date.now()}`, name };
      cat.sections = [...cat.sections, newSection];
      if (!(newSection.id in cat.sectionColors)) cat.sectionColors[newSection.id] = "#64748b";
      await writeCatalog(cat);
      return ok(cat);
    }
    case "renameSection": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();
      if (!id || !name) return bad("Невозможно переименовать");
      cat.sections = cat.sections.map((s) => (s.id === id ? { ...s, name } : s));
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteSection": {
      const id = String(body.id ?? "");
      if (!id || !cat.sections.some((s) => s.id === id)) return bad("Раздел не найден", 404);
      const affected = cat.materials.filter((m) => m.lessonType === id);
      const moveAction = String(body.moveAction ?? "delete");
      const moveToId = String(body.moveToId ?? "");
      if (affected.length > 0 && moveAction === "move" && moveToId) {
        cat.materials = cat.materials.map((m) => (m.lessonType === id ? { ...m, lessonType: moveToId } : m));
      } else if (affected.length > 0) {
        cat.materials = cat.materials.filter((m) => m.lessonType !== id);
      }
      cat.sections = cat.sections.filter((s) => s.id !== id);
      const nextColors = { ...cat.sectionColors };
      delete nextColors[id];
      cat.sectionColors = nextColors;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "addSubject": {
      const name = String(body.name ?? "").trim();
      if (!name) return bad("Название предмета не может быть пустым");
      const newSubj: Subject = { id: `${slugify(name)}-${Date.now()}`, name };
      cat.subjects = [...cat.subjects, newSubj];
      await writeCatalog(cat);
      return ok(cat);
    }
    case "renameSubject": {
      const id = String(body.id ?? "");
      const name = String(body.name ?? "").trim();
      if (!id || !name) return bad("Невозможно переименовать");
      cat.subjects = cat.subjects.map((s) => (s.id === id ? { ...s, name } : s));
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteSubject": {
      const id = String(body.id ?? "");
      if (!id || !cat.subjects.some((s) => s.id === id)) return bad("Предмет не найден", 404);
      const affected = cat.materials.filter((m) => m.subjectId === id);
      const moveAction = String(body.moveAction ?? "delete");
      const moveToId = String(body.moveToId ?? "");
      if (affected.length > 0 && moveAction === "move" && moveToId) {
        cat.materials = cat.materials.map((m) => (m.subjectId === id ? { ...m, subjectId: moveToId } : m));
      } else if (affected.length > 0) {
        cat.materials = cat.materials.filter((m) => m.subjectId !== id);
      }
      cat.subjects = cat.subjects.filter((s) => s.id !== id);
      const nextColors = { ...cat.subjectColors };
      delete nextColors[id];
      cat.subjectColors = nextColors;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "addMaterial": {
      const mat = body.material as Material | undefined;
      if (!mat || typeof mat !== "object" || !mat.id || !mat.title) return bad("Материал не задан");
      cat.materials = [mat, ...cat.materials];
      await writeCatalog(cat);
      return ok(cat);
    }
    case "updateMaterial": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Material> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      cat.materials = cat.materials.map((m) => (m.id === id ? { ...m, ...patch } : m));
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteMaterial": {
      const id = String(body.id ?? "");
      if (!id) return bad("Нет материала");
      cat.materials = cat.materials.filter((m) => m.id !== id);
      await writeCatalog(cat);
      return ok(cat);
    }
    case "setSectionColor": {
      const id = String(body.id ?? "");
      const color = String(body.color ?? "#64748b");
      if (!id) return bad("Нет раздела");
      if (!/^#[0-9a-f]{6}$/i.test(color)) return bad("Некорректный цвет");
      cat.sectionColors[id] = color;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "resetSectionColors": {
      cat.sectionColors = { ...SECTION_COLORS_DEFAULT };
      await writeCatalog(cat);
      return ok(cat);
    }
    case "setSubjectColor": {
      const id = String(body.id ?? "");
      const color = String(body.color ?? "#64748b");
      if (!id) return bad("Нет предмета");
      if (!/^#[0-9a-f]{6}$/i.test(color)) return bad("Некорректный цвет");
      cat.subjectColors[id] = color;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "clearSubjectColor": {
      const id = String(body.id ?? "");
      if (!id) return bad("Нет предмета");
      const nextColors = { ...cat.subjectColors };
      delete nextColors[id];
      cat.subjectColors = nextColors;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "resetSubjectColors": {
      cat.subjectColors = {};
      await writeCatalog(cat);
      return ok(cat);
    }
    case "replaceAll": {
      const snapshot = body.catalog as CatalogData | undefined;
      if (!snapshot || typeof snapshot !== "object") return bad("Нет данных");
      cat.sections = Array.isArray(snapshot.sections) ? snapshot.sections : cat.sections;
      cat.subjects = Array.isArray(snapshot.subjects) ? snapshot.subjects : cat.subjects;
      cat.materials = Array.isArray(snapshot.materials) ? snapshot.materials : cat.materials;
      cat.sectionColors = { ...SECTION_COLORS_DEFAULT, ...(snapshot.sectionColors ?? {}) };
      cat.subjectColors = typeof snapshot.subjectColors === "object" && snapshot.subjectColors ? snapshot.subjectColors : {};
      await writeCatalog(cat);
      return ok(cat);
    }
    default:
      return bad("Неизвестное действие", 400);
  }
}