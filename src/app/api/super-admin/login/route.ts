import { NextResponse } from "next/server";
import { isSuperAdminPasswordValid, setSuperAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const password = String(json?.password ?? "");

    if (!isSuperAdminPasswordValid(password)) {
      return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
    }

    await setSuperAdminSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/super-admin/login error", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
