import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/session";
import { logAudit, readAudit } from "@/lib/server/audit";

function getIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

// GET — только админ: просмотр журнала
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);

  let all = await readAudit();
  if (action && action !== "all") all = all.filter((r) => r.action === action);
  if (q) {
    all = all.filter((r) =>
      `${r.email ?? ""} ${r.userName ?? ""} ${r.details ?? ""} ${r.action}`.toLowerCase().includes(q)
    );
  }
  return NextResponse.json({ items: all.slice(0, limit), total: all.length });
}

// POST — залогировать действие текущего пользователя (или гостя)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "").slice(0, 64);
  const details = typeof body?.details === "string" ? body.details.slice(0, 500) : undefined;
  if (!action) return NextResponse.json({ error: "Нет действия" }, { status: 400 });

  const allowedClient = new Set(["material_view", "material_download", "page_view"]);
  if (!allowedClient.has(action) && (!user || user.role !== "admin")) {
    // обычные пользователи могут слать только безопасные события
    if (!allowedClient.has(action)) {
      return NextResponse.json({ error: "Действие запрещено" }, { status: 403 });
    }
  }

  await logAudit({
    userId: user?.id ?? null,
    email: user?.email ?? null,
    userName: user?.name ?? "Гость",
    role: user?.role ?? "guest",
    action,
    details,
    ip: getIp(req),
  });
  return NextResponse.json({ ok: true });
}
