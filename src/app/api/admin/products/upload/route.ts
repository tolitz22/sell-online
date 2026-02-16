import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    { ok: false, error: "Route moved. Use /api/store/{slug}/admin/products/upload" },
    { status: 410 },
  );
}
