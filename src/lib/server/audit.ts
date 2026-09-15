import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type AuditAction =
  | "register"
  | "login"
  | "logout"
  | "subscription_buy"
  | "subscription_cancel"
  | "material_view"
  | "material_download"
  | "material_create"
  | "role_change"
  | "page_view";

export type AuditRecord = {
  id: string;
  createdAt: string;
  userId: string | null;
  email: string | null;
  userName: string | null;
  role: string | null;
  action: AuditAction | string;
  details?: string;
  ip?: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const AUDIT_FILE = path.join(DATA_DIR, "audit.json");
const MAX_RECORDS = 2000;

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(AUDIT_FILE, "utf-8");
  } catch {
    await writeFile(AUDIT_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readAudit(): Promise<AuditRecord[]> {
  await ensureFile();
  const raw = await readFile(AUDIT_FILE, "utf-8");
  try {
    const arr = JSON.parse(raw) as AuditRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function logAudit(entry: Omit<AuditRecord, "id" | "createdAt">): Promise<AuditRecord> {
  await ensureFile();
  const rec: AuditRecord = {
    ...entry,
    id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const all = await readAudit();
  const next = [rec, ...all].slice(0, MAX_RECORDS);
  await writeFile(AUDIT_FILE, JSON.stringify(next, null, 2), "utf-8");
  return rec;
}
