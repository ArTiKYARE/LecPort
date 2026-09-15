import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await readCatalog();
  return NextResponse.json({ ok: true, catalog });
}