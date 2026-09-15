import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";

export type UserRole = "buyer" | "moderator" | "admin";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  hasSubscription: boolean;
  subscriptionPlan?: string;
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
  rec.hasSubscription = true;
  rec.subscriptionPlan = plan;
  await writeUsers(users);
  return toPublic(rec);
}
