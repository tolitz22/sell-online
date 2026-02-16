import { NextResponse } from "next/server";

export async function POST(req: Request) {
  void req;
  return NextResponse.json(
    { ok: false, error: "Route moved. Use /api/store/{slug}/admin/login" },
    { status: 410 },
  );
}
