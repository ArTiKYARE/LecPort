import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { planById } from "@/lib/plans";

export type UserRole = "buyer" | "moderator" | "admin";

export type UserRecord = {
  id: string;
  username: string;
  name?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  hasSubscription: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  cancelAtPeriodEnd?: boolean;
  /** Дата окончания статуса «Премиум». */
  premiumUntil?: string;
  createdAt: string;
};

export type PublicUser = Omit<UserRecord, "passwordHash">;

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(USERS_FILE, "utf-8");
  } catch {
    // seed: администратор для демо
    const adminHash = await bcrypt.hash("admin123", 10);
    const seed: UserRecord[] = [
      {
        id: "u_admin",
        username: "admin",
        name: "Администратор",
        email: "admin@lecport.local",
        passwordHash: adminHash,
        role: "admin",
        hasSubscription: true,
        subscriptionPlan: "year",
        createdAt: new Date().toISOString(),
      },
    ];
    await writeFile(USERS_FILE, JSON.stringify(seed, null, 2), "utf-8");
  }
}

/** Вернуть отображаемое имя пользователя: приоритет username → name → email. */
export function displayName(u: Pick<UserRecord, "username" | "name" | "email"> | PublicUser | undefined | null): string {
  if (!u) return "Аноним";
  return u.username || u.name || u.email.split("@")[0];
}

export async function readUsers(): Promise<UserRecord[]> {
  await ensureFile();
  const raw = await readFile(USERS_FILE, "utf-8");
  const list = JSON.parse(raw) as UserRecord[];
  // Бэкофил: если у старых пользователей нет username — генерируем из email (уникальность(suffix) проверяем).
  let changed = false;
  const usernames = new Set(list.filter((u) => u.username).map((u) => u.username));
  for (const u of list) {
    if (u.username) continue;
    let base = u.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "user";
    let candidate = base;
    let i = 1;
    while (usernames.has(candidate)) { candidate = `${base}${i++}`; }
    u.username = candidate;
    usernames.add(candidate);
    changed = true;
  }
  if (changed) await writeFile(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  return list;
}

/** Проверка уникальности username (возвращает true, если username свободен). */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const users = await readUsers();
  return !users.some((u) => u.username.toLowerCase() === username.toLowerCase());
}

export async function writeUsers(users: UserRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function toPublic(u: UserRecord): PublicUser {
  const { passwordHash: _ph, ...pub } = u;
  return pub;
}

/** Активация подписки пользователя. Возвращает публичный профиль или null.
 *  Подписка = глобальный доступ к материалам + статус «Премиум» для создания сообществ. */
export async function activateSubscription(userId: string, plan: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;

  const months = planById(plan)?.months ?? 1;
  // Новый период отсчитываем от текущего конца (если он в будущем) — продление.
  const base = rec.subscriptionExpiresAt ? Math.max(Date.now(), Date.parse(rec.subscriptionExpiresAt)) : Date.now();
  rec.hasSubscription = true;
  rec.subscriptionPlan = plan;
  rec.subscriptionExpiresAt = new Date(base + months * 30 * 24 * 60 * 60 * 1000).toISOString();
  rec.cancelAtPeriodEnd = false;
  // Глобальная подписка даёт «Премиум»: право создавать и вести сообщества.
  rec.premiumUntil = rec.subscriptionExpiresAt;

  await writeUsers(users);
  return toPublic(rec);
}

/** Выдача глобальной подписки Премиум на N дней: доступ + право создавать сообщества. */
export async function grantGlobalSubscription(userId: string, days: number): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  const daysClamped = Math.max(1, Math.min(366, days));
  const base = rec.subscriptionExpiresAt && Date.parse(rec.subscriptionExpiresAt) > Date.now()
    ? Date.parse(rec.subscriptionExpiresAt) : Date.now();
  rec.hasSubscription = true;
  rec.subscriptionPlan = "manual";
  rec.subscriptionExpiresAt = new Date(base + daysClamped * 86400000).toISOString();
  rec.cancelAtPeriodEnd = false;
  rec.premiumUntil = rec.subscriptionExpiresAt;
  await writeUsers(users);
  return toPublic(rec);
}

/** Снятие глобальной подписки Премиум (также лишает статуса «Премиум»). */
export async function revokeGlobalSubscription(userId: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  rec.hasSubscription = false;
  rec.subscriptionPlan = undefined;
  rec.subscriptionExpiresAt = undefined;
  rec.cancelAtPeriodEnd = false;
  rec.premiumUntil = undefined;
  await writeUsers(users);
  return toPublic(rec);
}

/**
 * Активна ли Премиум-подписка владельца сообщества.
 * Платформенные админы/модераторы считаются всегда активными.
 */
export function ownerPremiumActive(ownerId: string | undefined, users: Pick<UserRecord, "id" | "role" | "premiumUntil">[]): boolean {
  if (!ownerId) return true; // платформенное сообщество — не замораживаем
  const u = users.find((x) => x.id === ownerId);
  if (!u) return true;
  if (u.role === "admin" || u.role === "moderator") return true;
  return isPremium(u);
}

/** У пользователя есть доступ к полному содержимому (роль или активная подписка). */
export function hasFullAccess(u: Pick<UserRecord, "role" | "hasSubscription" | "subscriptionExpiresAt">): boolean {
  if (u.role === "admin" || u.role === "moderator") return true;
  if (u.role === "buyer" && u.hasSubscription) {
    if (!u.subscriptionExpiresAt) return true;
    return Date.parse(u.subscriptionExpiresAt) > Date.now();
  }
  return false;
}

/** Проверка активного статуса «Премиум». */
export function isPremium(u: Pick<UserRecord, "premiumUntil">): boolean {
  return Boolean(u.premiumUntil && Date.parse(u.premiumUntil) > Date.now());
}

/** Назначение премиума на N дней (от текущей даты). */
export async function grantPremium(userId: string, days: number): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  const daysClamped = Math.max(1, Math.min(366, days));
  // Продление: если текущий премиум ещё активен, прибавляем к его окончанию.
  const base = rec.premiumUntil && Date.parse(rec.premiumUntil) > Date.now() ? Date.parse(rec.premiumUntil) : Date.now();
  rec.premiumUntil = new Date(base + daysClamped * 86400000).toISOString();
  await writeUsers(users);
  return toPublic(rec);
}

/** Снятие премиума. */
export async function revokePremium(userId: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  rec.premiumUntil = undefined;
  await writeUsers(users);
  return toPublic(rec);
}

/** Прекращение автопродления: доступ сохраняется до конца оплаченного периода. */
export async function cancelAutoRenew(userId: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  rec.cancelAtPeriodEnd = true;
  await writeUsers(users);
  return toPublic(rec);
}
