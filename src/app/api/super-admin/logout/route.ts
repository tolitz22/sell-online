import { NextResponse } from "next/server";
import { clearSuperAdminSessionCookie } from "@/lib/admin-auth";

export async function POST() {
  await clearSuperAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
