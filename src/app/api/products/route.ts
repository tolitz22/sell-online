import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Route moved. Use /api/store/{slug}/products" },
    { status: 410 },
  );
}
