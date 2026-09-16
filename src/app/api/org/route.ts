import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { readCatalog, writeCatalog, recalcServiceRating, enrichOwners, type CatalogData } from "@/lib/server/catalog";
import { readUsers, ownerPremiumActive, type UserRecord } from "@/lib/server/users";
import type {
  Organization, OrgMember, OrgSection, OrgNewsEntry,
  Material, Course, Service,
} from "@/lib/types";
import { getOrgRole, canPublishContent, canManageOrg } from "@/lib/types";

export const dynamic = "force-dynamic";

function ok(cat: CatalogData, users: UserRecord[]) {
  return NextResponse.json({ ok: true, catalog: enrichOwners(cat, users) });
}
function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-");

function newsId() {
  return `news-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Платформенные админы/модераторы могут управлять любым сообществом (platform-level override). */
function isPlatformManager(role: string) {
  return role === "admin" || role === "moderator";
}

/**
 * Разрешено ли сообществу производить новые действия (публикации, приём участников и т.п.).
 * Если у владельца кончилась Премиум-подписка — сообщество «замораживается»:
 * разрешено только редактировать уже существующие данные (update*).
 */
function orgFrozen(org: Organization | undefined, meRole: string, users: UserRecord[]): boolean {
  if (!org) return false;
  if (isPlatformManager(meRole)) return false; // админ/модератор обходит заморозку
  return !ownerPremiumActive(org.ownerId, users);
}

const FROZEN_MSG = "Сообщество заморожено: у создателя кончилась Премиум-подписка. Сейчас доступно только редактирование существующих данных. Продлите подписку, чтобы возобновить действия в сообществе.";

function forbiddenFrozen(org: Organization | undefined, meRole: string, users: UserRecord[]) {
  return orgFrozen(org, meRole, users) ? bad(FROZEN_MSG, 403) : null;
}

/**
 * POST /api/org — управления сообществами:
 *   - addOrganization / updateOrganization / deleteOrganization
 *   - joinOrganization / leaveOrganization / approveJoin / rejectJoin / setMemberRole / removeMember
 *   - addOrgSection / updateOrgSection / deleteOrgSection
 *   - addMaterial / updateMaterial / deleteMaterial (org-scoped, author+)
 *   - addCourse / updateCourse / deleteCourse (standalone + org)
 *   - addService / updateService / deleteService (standalone + org)
 *   - postAnnouncement / deleteNews
 */
export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return bad("Войдите в аккаунт", 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.action !== "string") return bad("Некорректный запрос");

  const cat = await readCatalog();
  const users = await readUsers();
  const action = body.action;

  // ─── Организации ──────────────────────────────────────────────────────

  switch (action) {

    case "addOrganization": {
      const name = String(body.name ?? "").trim();
      if (!name) return bad("Название сообщества не может быть пустым");
      // Премиум (или платформенный админ/модератор).
      if (!isPlatformManager(me.role)) {
        const hasPremium = Boolean(me.premiumUntil && new Date(me.premiumUntil).getTime() > Date.now());
        if (!hasPremium) return bad("Сообщества могут создавать только пользователи с Премиум-подпиской", 403);
      }
      const newOrg: Organization = {
        id: `org-${slug(name)}-${Date.now()}`,
        name,
        description: String(body.description ?? "").trim() || undefined,
        avatar: String(body.avatar ?? "").trim() || undefined,
        ownerId: me.id,
        verified: false,
        membership: body.membership === "request" ? "request" : "open",
        members: [],
        joinRequests: [],
        sections: [],
        news: [],
        createdAt: new Date().toISOString(),
      };
      cat.organizations = [...cat.organizations, newOrg];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "updateOrganization": {
      const id = String(body.id ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      const role = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && role !== "owner") return bad("Доступ запрещён", 403);
      const name = String(body.name ?? "").trim();
      if (name) org.name = name;
      if (typeof body.description === "string") org.description = body.description.trim() || undefined;
      if (typeof body.avatar === "string") org.avatar = body.avatar.trim() || undefined;
      if (body.membership === "open" || body.membership === "request") org.membership = body.membership;
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteOrganization": {
      const id = String(body.id ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      const role = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && role !== "owner") return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      cat.organizations = cat.organizations.filter((o) => o.id !== id);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Участники ─────────────────────────────────────────────────────

    case "joinOrganization": {
      const id = String(body.id ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      if (org.ownerId === me.id) return bad("Вы уже являетесь владельцем");
      const already = org.members.some((m) => m.userId === me.id);
      if (already) return bad("Вы уже состоите в сообществе");
      if (org.joinRequests?.includes(me.id)) return bad("Заявка уже отправлена");
      if (org.membership === "request") {
        org.joinRequests = [...(org.joinRequests ?? []), me.id];
      } else {
        org.members = [...org.members, { userId: me.id, role: "member", joinedAt: new Date().toISOString() }];
      }
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "leaveOrganization": {
      const id = String(body.id ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      if (org.ownerId === me.id) return bad("Владелец не может покинуть сообщество. Передайте владение другому участнику.");
      org.members = org.members.filter((m) => m.userId !== me.id);
      org.joinRequests = (org.joinRequests ?? []).filter((uid) => uid !== me.id);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "approveJoin": {
      const id = String(body.id ?? "");
      const userId = String(body.userId ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      const role = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(role)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      if (!(org.joinRequests ?? []).includes(userId)) return bad("Заявка не найдена");
      org.joinRequests = org.joinRequests.filter((uid) => uid !== userId);
      org.members = [...org.members, { userId, role: "member", joinedAt: new Date().toISOString() }];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "rejectJoin": {
      const id = String(body.id ?? "");
      const userId = String(body.userId ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      const role = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(role)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      org.joinRequests = (org.joinRequests ?? []).filter((uid) => uid !== userId);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "setMemberRole": {
      const id = String(body.id ?? "");
      const userId = String(body.userId ?? "");
      const newRole = String(body.role ?? "") as OrgMember["role"];
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      if (!["member", "author", "moderator"].includes(newRole)) return bad("Некорректная роль");
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && callerRole !== "owner") return bad("Только владелец может назначать роли");
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      if (userId === org.ownerId) return bad("Нельзя изменить роль владельца");
      const m = org.members.find((x) => x.userId === userId);
      if (!m) return bad("Участник не найден", 404);
      m.role = newRole;
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "removeMember": {
      const id = String(body.id ?? "");
      const userId = String(body.userId ?? "");
      const org = cat.organizations.find((o) => o.id === id);
      if (!org) return bad("Сообщество не найдено", 404);
      if (userId === org.ownerId) return bad("Нельзя удалить владельца");
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      org.members = org.members.filter((m) => m.userId !== userId);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Секции каталога сообщества ────────────────────────────────────

    case "addOrgSection": {
      const orgId = String(body.orgId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      const name = String(body.name ?? "").trim();
      if (!name) return bad("Название секции не может быть пустым");
      const price = body.price != null ? Math.max(0, Number(body.price) || 0) : undefined;
      const sec: OrgSection = {
        id: `sec-${slug(name)}-${Date.now()}`,
        name,
        description: String(body.description ?? "").trim() || undefined,
        price,
        color: String(body.color ?? "").trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      org.sections = [...(org.sections ?? []), sec];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "updateOrgSection": {
      const orgId = String(body.orgId ?? "");
      const secId = String(body.secId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Доступ запрещён", 403);
      const sec = (org.sections ?? []).find((s) => s.id === secId);
      if (!sec) return bad("Секция не найдена", 404);
      const name = String(body.name ?? "").trim();
      if (name) sec.name = name;
      if (typeof body.description === "string") sec.description = body.description.trim() || undefined;
      if (body.price != null || body.price === "") sec.price = body.price === "" || body.price == null ? undefined : Math.max(0, Number(body.price) || 0);
      if (typeof body.color === "string") sec.color = body.color.trim() || undefined;
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteOrgSection": {
      const orgId = String(body.orgId ?? "");
      const secId = String(body.secId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      org.sections = (org.sections ?? []).filter((s) => s.id !== secId);
      // Материалы в этой секции остаются, но привязка снимается.
      cat.materials = cat.materials.map((m) => (m.orgSectionId === secId ? { ...m, orgSectionId: undefined } : m));
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Материалы (org-scoped) ────────────────────────────────────────

    case "addMaterial": {
      const mat = body.material as Material | undefined;
      if (!mat || typeof mat !== "object" || !mat.id || !mat.title) return bad("Материал не задан");
      const orgId = String(mat.organizationId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Только авторы и выше могут публиковать в сообществе", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      // Если задана секция и у секции есть цена — наследуем цену для материала.
      if (mat.orgSectionId) {
        const sec = (org.sections ?? []).find((s) => s.id === mat.orgSectionId);
        if (sec && (sec.price ?? 0) > 0 && mat.price == null) mat.price = sec.price;
      }
      // Авто-новость
      const news: OrgNewsEntry = {
        id: newsId(), kind: "material", title: mat.title,
        targetId: mat.id, authorId: me.id, authorName: me.username ?? me.name ?? "Пользователь",
        createdAt: new Date().toISOString(),
      };
      org.news = [news, ...(org.news ?? [])].slice(0, 50);
      cat.materials = [mat, ...cat.materials];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "updateMaterial": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Material> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      const mat = cat.materials.find((m) => m.id === id);
      if (!mat) return bad("Материал не найден", 404);
      const orgId = String(patch.organizationId ?? mat.organizationId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Доступ запрещён", 403);
      } else if (!isPlatformManager(me.role)) {
        return bad("Материал без организации может редактировать только модератор", 403);
      }
      cat.materials = cat.materials.map((m) => (m.id === id ? { ...m, ...patch } : m));
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteMaterial": {
      const id = String(body.id ?? "");
      if (!id) return bad("Нет материала");
      const mat = cat.materials.find((m) => m.id === id);
      if (!mat) return bad("Материал не найден", 404);
      const orgId = String(mat.organizationId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Доступ запрещён", 403);
        const frozen = forbiddenFrozen(org, me.role, users);
        if (frozen) return frozen;
      } else if (!isPlatformManager(me.role)) {
        return bad("Материал без организации может удалить только модератор", 403);
      }
      cat.materials = cat.materials.filter((m) => m.id !== id);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Курсы (org-scoped + standalone) ──────────────────────────────

    case "addCourse": {
      const title = String(body.title ?? "").trim();
      if (!title) return bad("Название курса не может быть пустым");
      const organizationId = String(body.organizationId ?? "") || undefined;
      let price = body.price === "" || body.price == null ? undefined : Number(body.price);
      if (organizationId) {
        const org = cat.organizations.find((o) => o.id === organizationId);
        if (!org) return bad("Сообщество не найдено", 404);
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Только авторы и выше могут создавать курсы в сообществе", 403);
        const frozen = forbiddenFrozen(org, me.role, users);
        if (frozen) return frozen;
        // Цену внутри организации может менять только создатель/модератор/админ
        if (price != null && price > 0) {
          if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) {
            price = undefined; // автор не может ставить цену — игнорируем
          }
        }
        // Авто-новость
        const news: OrgNewsEntry = {
          id: newsId(), kind: "course", title,
          targetId: `course-${Date.now()}`, authorId: me.id, authorName: me.username ?? me.name ?? "Пользователь",
          createdAt: new Date().toISOString(),
        };
        org.news = [news, ...(org.news ?? [])].slice(0, 50);
      }
      const newCourse: Course = {
        id: `course-${slug(title)}-${Date.now()}`,
        title,
        description: String(body.description ?? "").trim() || undefined,
        organizationId,
        authorId: organizationId ? undefined : me.id, // standalone — автор это владелец
        price,
        modules: Array.isArray(body.modules) ? body.modules : [],
        createdAt: new Date().toISOString(),
      };
      cat.courses = [newCourse, ...cat.courses];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "updateCourse": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Course> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      const cur = cat.courses.find((c) => c.id === id);
      if (!cur) return bad("Курс не найден", 404);
      // Проверка прав
      const orgId = String(patch.organizationId ?? cur.organizationId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Доступ запрещён", 403);
        if (patch.price != null && patch.price > 0) {
          if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) {
            delete patch.price; // автор не может менять цену
          }
        }
      } else {
        // standalone: автор или админ/мод
        if (!isPlatformManager(me.role) && cur.authorId !== me.id) return bad("Доступ запрещён", 403);
      }
      const next: Course = { ...cur, ...patch };
      if (typeof patch.price === "string") next.price = patch.price === "" ? undefined : Number(patch.price);
      next.modules = Array.isArray(next.modules) ? next.modules.map((mod) => ({
        ...mod,
        materialIds: Array.isArray(mod.materialIds) ? mod.materialIds : [],
      })) : [];
      cat.courses = cat.courses.map((c) => (c.id === id ? next : c));
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteCourse": {
      const id = String(body.id ?? "");
      const cur = cat.courses.find((c) => c.id === id);
      if (!cur) return bad("Курс не найден", 404);
      const org = cat.organizations.find((o) => o.id === cur.organizationId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Только владелец/модератор может удалять курсы сообщества", 403);
        const frozen = forbiddenFrozen(org, me.role, users);
        if (frozen) return frozen;
      } else {
        if (!isPlatformManager(me.role) && cur.authorId !== me.id) return bad("Доступ запрещён", 403);
      }
      cat.courses = cat.courses.filter((c) => c.id !== id);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Услуги (org-scoped + standalone) ─────────────────────────────

    case "addService": {
      const title = String(body.title ?? "").trim();
      if (!title) return bad("Название услуги не может быть пустым");
      const category = String(body.category ?? "consult").trim();
      const priceType = body.priceType === "hourly" ? "hourly" : "fixed";
      let price = body.price === "" || body.price == null ? undefined : Number(body.price);
      const organizationId = String(body.organizationId ?? "") || undefined;
      if (organizationId) {
        const org = cat.organizations.find((o) => o.id === organizationId);
        if (!org) return bad("Сообщество не найдено", 404);
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Только авторы и выше могут создавать услуги в сообществе", 403);
        const frozen = forbiddenFrozen(org, me.role, users);
        if (frozen) return frozen;
        if (price != null && price > 0) {
          if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) price = undefined;
        }
        const news: OrgNewsEntry = {
          id: newsId(), kind: "service", title,
          targetId: `svc-${Date.now()}`, authorId: me.id, authorName: me.username ?? me.name ?? "Пользователь",
          createdAt: new Date().toISOString(),
        };
        org.news = [news, ...(org.news ?? [])].slice(0, 50);
      }
      const newService: Service = {
        id: `svc-${slug(title)}-${Date.now()}`,
        title,
        description: String(body.description ?? "").trim() || "",
        category,
        priceType,
        price: price !== undefined && Number.isFinite(price) ? price : undefined,
        organizationId,
        authorId: organizationId ? undefined : me.id,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };
      cat.services = [newService, ...cat.services];
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "updateService": {
      const id = String(body.id ?? "");
      const patch = body.patch as Partial<Service> | undefined;
      if (!id || !patch || typeof patch !== "object") return bad("Патч не задан");
      const cur = cat.services.find((s) => s.id === id);
      if (!cur) return bad("Услуга не найдена", 404);
      const orgId = String(patch.organizationId ?? cur.organizationId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canPublishContent(callerRole)) return bad("Доступ запрещён", 403);
        if (patch.price != null && patch.price > 0) {
          if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) delete patch.price;
        }
      } else {
        if (!isPlatformManager(me.role) && cur.authorId !== me.id) return bad("Доступ запрещён", 403);
      }
      const next = { ...cur, ...patch };
      if (typeof patch.price === "string") next.price = patch.price === "" ? undefined : Number(patch.price);
      cat.services = cat.services.map((s) => (s.id === id ? next : s));
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteService": {
      const id = String(body.id ?? "");
      const cur = cat.services.find((s) => s.id === id);
      if (!cur) return bad("Услуга не найдена", 404);
      const org = cat.organizations.find((o) => o.id === cur.organizationId);
      if (org) {
        const callerRole = getOrgRole(org, me.id);
        if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Только владелец/модератор может удалять услуги сообщества", 403);
        const frozen = forbiddenFrozen(org, me.role, users);
        if (frozen) return frozen;
      } else {
        if (!isPlatformManager(me.role) && cur.authorId !== me.id) return bad("Доступ запрещён", 403);
      }
      cat.services = cat.services.filter((s) => s.id !== id);
      cat.reviews = cat.reviews.filter((r) => !(r.targetType === "service" && r.targetId === id));
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Новостная лента ──────────────────────────────────────────────

    case "postAnnouncement": {
      const orgId = String(body.orgId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Только владелец/модератор может писать объявления", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      const title = String(body.title ?? "").trim();
      if (!title) return bad("Заголовок объявления не может быть пустым");
      const text = String(body.text ?? "").trim() || undefined;
      const news: OrgNewsEntry = {
        id: newsId(), kind: "announcement", title, text,
        authorId: me.id, authorName: me.username ?? me.name ?? "Пользователь",
        createdAt: new Date().toISOString(),
      };
      org.news = [news, ...(org.news ?? [])].slice(0, 50);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    case "deleteNews": {
      const orgId = String(body.orgId ?? "");
      const newsIdTarget = String(body.newsId ?? "");
      const org = cat.organizations.find((o) => o.id === orgId);
      if (!org) return bad("Сообщество не найдено", 404);
      const callerRole = getOrgRole(org, me.id);
      if (!isPlatformManager(me.role) && !canManageOrg(callerRole)) return bad("Доступ запрещён", 403);
      const frozen = forbiddenFrozen(org, me.role, users);
      if (frozen) return frozen;
      org.news = (org.news ?? []).filter((n) => n.id !== newsIdTarget);
      await writeCatalog(cat);
      return ok(cat, users);
    }

    // ─── Неизвестное действие ──────────────────────────────────────────

    default:
      return bad("Неизвестное действие", 400);
  }
}
