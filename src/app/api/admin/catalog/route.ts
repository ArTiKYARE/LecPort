import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { readCatalog, writeCatalog, recalcServiceRating, type CatalogData } from "@/lib/server/catalog";
import type { Material, Section, Subject, Organization, Course, Service, Review, CardStyle } from "@/lib/types";
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
    case "addOrganization": {
      const name = String(body.name ?? "").trim();
      if (!name) return bad("Название организации не может быть пустым");
      const newOrg: Organization = {
        id: `org-${slugify(name)}-${Date.now()}`,
        name,
        description: String(body.description ?? "").trim() || undefined,
        ownerId: String(body.ownerId ?? "") || undefined,
        verified: Boolean(body.verified),
        membership: body.membership === "request" ? "request" : "open",
        members: [],
        joinRequests: [],
        sections: [],
        news: [],
        createdAt: new Date().toISOString(),
      };
      cat.organizations = [...cat.organizations, newOrg];
      await writeCatalog(cat);
      return ok(cat);
    }
    case "updateOrganization": {
      const id = String(body.id ?? "");
      if (!id || !cat.organizations.some((o) => o.id === id)) return bad("Организация не найдена", 404);
      const name = String(body.name ?? "").trim();
      cat.organizations = cat.organizations.map((o) => {
        if (o.id !== id) return o;
        const next: Organization = { ...o };
        if (name) next.name = name;
        if (typeof body.description === "string") next.description = body.description.trim() || undefined;
        if (typeof body.verified === "boolean") next.verified = body.verified;
        return next;
      });
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteOrganization": {
      const id = String(body.id ?? "");
      if (!id || !cat.organizations.some((o) => o.id === id)) return bad("Организация не найдена", 404);
      cat.organizations = cat.organizations.filter((o) => o.id !== id);
      await writeCatalog(cat);
      return ok(cat);
    }
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
      // Материалы внутри курсов остаются ссылками: курс просто помечает их удалёнными из каталога.
      await writeCatalog(cat);
      return ok(cat);
    }
    // ============ КУРСЫ ============
    case "addCourse": {
      const title = String(body.title ?? "").trim();
      if (!title) return bad("Название курса не может быть пустым");
      const newCourse: Course = {
        id: `course-${slugify(title)}-${Date.now()}`,
        title,
        description: String(body.description ?? "").trim() || undefined,
        organizationId: String(body.organizationId ?? "") || undefined,
        price: body.price === "" || body.price == null ? undefined : Number(body.price),
        modules: Array.isArray(body.modules) ? body.modules : [],
        createdAt: new Date().toISOString(),
      };
      cat.courses = [newCourse, ...cat.courses];
      await writeCatalog(cat);
      return ok(cat);
    }
    case "updateCourse": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Course> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      const cur = cat.courses.find((c) => c.id === id);
      if (!cur) return bad("Курс не найден", 404);
      const next: Course = { ...cur, ...patch };
      if (typeof patch.price === "string") next.price = patch.price === "" ? undefined : Number(patch.price);
      next.modules = Array.isArray(next.modules) ? next.modules.map((mod) => ({
        ...mod,
        materialIds: Array.isArray(mod.materialIds) ? mod.materialIds : [],
      })) : [];
      cat.courses = cat.courses.map((c) => (c.id === id ? next : c));
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteCourse": {
      const id = String(body.id ?? "");
      if (!id || !cat.courses.some((c) => c.id === id)) return bad("Курс не найден", 404);
      cat.courses = cat.courses.filter((c) => c.id !== id);
      await writeCatalog(cat);
      return ok(cat);
    }
    // ============ ПРОДВИЖЕНИЕ ============
    case "promoteMaterial": {
      const id = String(body.id ?? "");
      const days = Math.max(1, Math.min(366, Number(body.days) || 7));
      const idx = cat.materials.findIndex((m) => m.id === id);
      if (idx < 0) return bad("Материал не найден", 404);
      const maxPriority = Math.max(0, ...cat.materials.map((m) => m.priority ?? 0));
      cat.materials[idx] = {
        ...cat.materials[idx],
        promotedUntil: new Date(Date.now() + days * 86400000).toISOString(),
        priority: maxPriority + 1,
      };
      await writeCatalog(cat);
      return ok(cat);
    }
    case "unpromoteMaterial": {
      const id = String(body.id ?? "");
      const idx = cat.materials.findIndex((m) => m.id === id);
      if (idx < 0) return bad("Материал не найден", 404);
      cat.materials[idx] = { ...cat.materials[idx], promotedUntil: undefined, priority: 0 };
      await writeCatalog(cat);
      return ok(cat);
    }
    case "promoteCourse": {
      const id = String(body.id ?? "");
      const days = Math.max(1, Math.min(366, Number(body.days) || 7));
      const idx = cat.courses.findIndex((c) => c.id === id);
      if (idx < 0) return bad("Курс не найден", 404);
      const maxPriority = Math.max(0, ...cat.courses.map((c) => c.priority ?? 0));
      cat.courses[idx] = {
        ...cat.courses[idx],
        promotedUntil: new Date(Date.now() + days * 86400000).toISOString(),
        priority: maxPriority + 1,
      };
      await writeCatalog(cat);
      return ok(cat);
    }
    case "unpromoteCourse": {
      const id = String(body.id ?? "");
      const idx = cat.courses.findIndex((c) => c.id === id);
      if (idx < 0) return bad("Курс не найден", 404);
      cat.courses[idx] = { ...cat.courses[idx], promotedUntil: undefined, priority: 0 };
      await writeCatalog(cat);
      return ok(cat);
    }
    // ============ УСЛУГИ ============
    case "addService": {
      const title = String(body.title ?? "").trim();
      if (!title) return bad("Название услуги не может быть пустым");
      const category = String(body.category ?? "consult").trim();
      const priceType = body.priceType === "hourly" ? "hourly" : "fixed";
      const price = body.price === "" || body.price == null ? undefined : Number(body.price);
      const newService: Service = {
        id: `svc-${slugify(title)}-${Date.now()}`,
        title,
        description: String(body.description ?? "").trim() || "",
        category,
        priceType,
        price: price !== undefined && Number.isFinite(price) ? price : undefined,
        organizationId: String(body.organizationId ?? "") || undefined,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };
      cat.services = [newService, ...cat.services];
      await writeCatalog(cat);
      return ok(cat);
    }
    case "updateService": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Service> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      if (!cat.services.some((s) => s.id === id)) return bad("Услуга не найдена", 404);
      cat.services = cat.services.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (typeof patch.price === "string") next.price = patch.price === "" ? undefined : Number(patch.price);
        return next;
      });
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteService": {
      const id = String(body.id ?? "");
      if (!id || !cat.services.some((s) => s.id === id)) return bad("Услуга не найдена", 404);
      cat.services = cat.services.filter((s) => s.id !== id);
      cat.reviews = cat.reviews.filter((r) => !(r.targetType === "service" && r.targetId === id));
      await writeCatalog(cat);
      return ok(cat);
    }
    case "promoteService": {
      const id = String(body.id ?? "");
      const days = Math.max(1, Math.min(366, Number(body.days) || 7));
      const idx = cat.services.findIndex((s) => s.id === id);
      if (idx < 0) return bad("Услуга не найдена", 404);
      const maxPriority = Math.max(0, ...cat.services.map((s) => s.priority ?? 0));
      cat.services[idx] = {
        ...cat.services[idx],
        promotedUntil: new Date(Date.now() + days * 86400000).toISOString(),
        priority: maxPriority + 1,
      };
      await writeCatalog(cat);
      return ok(cat);
    }
    case "unpromoteService": {
      const id = String(body.id ?? "");
      const idx = cat.services.findIndex((s) => s.id === id);
      if (idx < 0) return bad("Услуга не найдена", 404);
      cat.services[idx] = { ...cat.services[idx], promotedUntil: undefined, priority: 0 };
      await writeCatalog(cat);
      return ok(cat);
    }
    // ============ ОТЗЫВЫ ============
    case "addReview": {
      const targetType = String(body.targetType ?? "") as Review["targetType"];
      const targetId = String(body.targetId ?? "");
      const authorId = String(body.authorId ?? "");
      const authorName = String(body.authorName ?? "Аноним");
      const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
      if (!targetId) return bad("targetId не задан");
      if (!["service", "course", "material"].includes(targetType)) return bad("Некорректный targetType");
      const newReview: Review = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        targetType,
        targetId,
        authorId,
        authorName,
        rating,
        text: String(body.text ?? "").trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      cat.reviews = [...cat.reviews, newReview];
      // Пересчитать рейтинг услуги, если это отзыв на услугу.
      if (targetType === "service") recalcServiceRating(cat, targetId);
      await writeCatalog(cat);
      return ok(cat);
    }
    case "deleteReview": {
      const id = String(body.id ?? "");
      if (!id) return bad("Нет отзыва");
      const rev = cat.reviews.find((r) => r.id === id);
      cat.reviews = cat.reviews.filter((r) => r.id !== id);
      if (rev?.targetType === "service") recalcServiceRating(cat, rev.targetId);
      await writeCatalog(cat);
      return ok(cat);
    }
    // ============ ВЫВОД ============
    case "setSectionColor": {
      const id = String(body.id ?? "");
      const color = String(body.color ?? "#64748b");
      if (!id) return bad("Нет раздела");
      if (!/^#[0-9a-f]{6}$/i.test(color)) return bad("Некорректный цвет");
      cat.sectionColors[id] = color;
      await writeCatalog(cat);
      return ok(cat);
    }
    case "setSectionCard": {
      const id = String(body.id ?? "");
      const card = body.card as CardStyle | undefined;
      if (!id) return bad("Нет раздела");
      if (!card || typeof card !== "object") return bad("Оформление не задано");
      const cur = cat.sections.find((s) => s.id === id);
      if (!cur) return bad("Раздел не найден", 404);
      cat.sections = cat.sections.map((s) => (s.id === id ? { ...s, card: { ...cur.card, ...card, imageUrl: card.imageUrl || undefined } } : s));
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
    case "setSubjectCard": {
      const id = String(body.id ?? "");
      const card = body.card as CardStyle | undefined;
      if (!id) return bad("Нет предмета");
      if (!card || typeof card !== "object") return bad("Оформление не задано");
      const cur = cat.subjects.find((s) => s.id === id);
      if (!cur) return bad("Предмет не найден", 404);
      cat.subjects = cat.subjects.map((s) => (s.id === id ? { ...s, card: { ...cur.card, ...card, imageUrl: card.imageUrl || undefined } } : s));
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
      cat.organizations = Array.isArray(snapshot.organizations) ? snapshot.organizations : cat.organizations;
      cat.courses = Array.isArray(snapshot.courses) ? snapshot.courses : cat.courses;
      cat.services = Array.isArray(snapshot.services) ? snapshot.services : cat.services;
      cat.reviews = Array.isArray(snapshot.reviews) ? snapshot.reviews : cat.reviews;
      cat.sectionColors = { ...SECTION_COLORS_DEFAULT, ...(snapshot.sectionColors ?? {}) };
      cat.subjectColors = typeof snapshot.subjectColors === "object" && snapshot.subjectColors ? snapshot.subjectColors : {};
      await writeCatalog(cat);
      return ok(cat);
    }
    default:
      return bad("Неизвестное действие", 400);
  }
}