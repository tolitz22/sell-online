import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Route moved. Use /api/store/{slug}/admin/logout" },
    { status: 410 },
  );
}
