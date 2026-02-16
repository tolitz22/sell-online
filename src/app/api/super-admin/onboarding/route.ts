import { NextResponse } from "next/server";
import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import { getPendingOnboardingRequests } from "@/lib/tenant-db";

export async function GET() {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const requests = getPendingOnboardingRequests();
  return NextResponse.json({ ok: true, requests });
}
