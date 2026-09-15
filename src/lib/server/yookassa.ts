import { randomUUID } from "crypto";

const API = "https://api.yookassa.ru/v3";
const SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const SECRET = process.env.YOOKASSA_SECRET_KEY || "";

export function yookassaConfigured() {
  return Boolean(SHOP_ID && SECRET);
}

export function yookassaReturnUrl(fallbackPath = "/cabinet") {
  if (process.env.YOOKASSA_RETURN_URL) return process.env.YOOKASSA_RETURN_URL;
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  return base ? `${base}${fallbackPath}` : fallbackPath;
}

function authHeader() {
  return "Basic " + Buffer.from(`${SHOP_ID}:${SECRET}`).toString("base64");
}

export type YooPayment = {
  id: string;
  status: string;
  paid?: boolean;
  amount: { value: string; currency: string };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
  created_at?: string;
};

async function handle(res: Response): Promise<YooPayment> {
  const text = await res.text();
  let json: YooPayment;
  try {
    json = JSON.parse(text) as YooPayment;
  } catch {
    throw new Error(`YooKassa: HTTP ${res.status}`);
  }
  if (!res.ok) throw new Error(`YooKassa: HTTP ${res.status} ${(text || "").slice(0, 200)}`);
  return json;
}

export async function createYooPayment(opts: {
  amountRub: number;
  description: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<YooPayment> {
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Idempotence-Key": randomUUID(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: { value: opts.amountRub.toFixed(2), currency: "RUB" },
      capture: true,
      confirmation: { type: "redirect", return_url: opts.returnUrl },
      description: opts.description.slice(0, 128),
      metadata: opts.metadata,
    }),
  });
  return handle(res);
}

export async function getYooPayment(id: string): Promise<YooPayment> {
  const res = await fetch(`${API}/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: authHeader() },
  });
  return handle(res);
}
