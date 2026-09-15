import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

export type PendingPayment = {
  userId: string;
  plan: string;
  createdAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "pending.json");

async function readAll(): Promise<Record<string, PendingPayment>> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(FILE, "utf-8");
    const j = JSON.parse(raw);
    return typeof j === "object" && j !== null ? j : {};
  } catch {
    return {};
  }
}

async function writeAll(all: Record<string, PendingPayment>) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(all, null, 2), "utf-8");
}

export async function savePending(paymentId: string, rec: PendingPayment) {
  const all = await readAll();
  all[paymentId] = rec;
  await writeAll(all);
}

export async function removePending(paymentId: string) {
  const all = await readAll();
  delete all[paymentId];
  await writeAll(all);
}

export async function pendingForUser(userId: string): Promise<{ paymentId: string; rec: PendingPayment }[]> {
  const all = await readAll();
  return Object.entries(all)
    .filter(([, r]) => r.userId === userId)
    .map(([paymentId, rec]) => ({ paymentId, rec }));
}

export async function pendingById(paymentId: string): Promise<PendingPayment | null> {
  const all = await readAll();
  return all[paymentId] ?? null;
}
