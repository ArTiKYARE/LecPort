import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { planById } from "@/lib/plans";

export type UserRole = "buyer" | "moderator" | "admin";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  hasSubscription: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  cancelAtPeriodEnd?: boolean;
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

export async function readUsers(): Promise<UserRecord[]> {
  await ensureFile();
  const raw = await readFile(USERS_FILE, "utf-8");
  return JSON.parse(raw) as UserRecord[];
}

export async function writeUsers(users: UserRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export function toPublic(u: UserRecord): PublicUser {
  const { passwordHash: _ph, ...pub } = u;
  return pub;
}

/** Активация подписки пользователя. Возвращает публичный профиль или null. */
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

  await writeUsers(users);
  return toPublic(rec);
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

/** Прекращение автопродления: доступ сохраняется до конца оплаченного периода. */
export async function cancelAutoRenew(userId: string): Promise<PublicUser | null> {
  const users = await readUsers();
  const rec = users.find((u) => u.id === userId);
  if (!rec) return null;
  rec.cancelAtPeriodEnd = true;
  await writeUsers(users);
  return toPublic(rec);
}
