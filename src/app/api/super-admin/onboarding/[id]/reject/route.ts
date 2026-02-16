import { NextResponse } from "next/server";
import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import { getOnboardingRequestById, updateOnboardingRequestStatus } from "@/lib/tenant-db";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const requestRow = getOnboardingRequestById(id);
    if (!requestRow) {
      return NextResponse.json({ ok: false, error: "Onboarding request not found" }, { status: 404 });
    }
    if (requestRow.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "Request already reviewed" }, { status: 409 });
    }

    updateOnboardingRequestStatus(id, "REJECTED");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/super-admin/onboarding/[id]/reject error", error);
    return NextResponse.json({ ok: false, error: "Failed to reject request" }, { status: 500 });
  }
}
