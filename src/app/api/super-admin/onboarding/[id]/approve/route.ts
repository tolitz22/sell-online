import { NextResponse } from "next/server";
import { z } from "zod";
import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import {
  createTenant,
  getAllTenants,
  getOnboardingRequestById,
  updateOnboardingRequestStatus,
} from "@/lib/tenant-db";
import { upsertTenantInSheet } from "@/lib/tenant-registry-sheet";

const approveSchema = z.object({
  adminPassword: z.string().min(4, "Admin password is required"),
});

function uniqueValue(base: string, existing: Set<string>) {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = approveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const requestRow = getOnboardingRequestById(id);
    if (!requestRow) {
      return NextResponse.json({ ok: false, error: "Onboarding request not found" }, { status: 404 });
    }
    if (requestRow.status !== "PENDING") {
      return NextResponse.json({ ok: false, error: "Request already reviewed" }, { status: 409 });
    }

    const allTenants = getAllTenants();
    const uniqueSlug = uniqueValue(requestRow.slug, new Set(allTenants.map((tenant) => tenant.slug)));
    const uniqueCloudinaryFolder = uniqueValue(
      requestRow.cloudinaryFolder,
      new Set(allTenants.map((tenant) => tenant.cloudinaryFolder).filter(Boolean)),
    );

    const tenant = createTenant({
      slug: uniqueSlug,
      storeName: requestRow.storeName,
      ownerName: requestRow.ownerName,
      heroBadge: "Online Store",
      heroHeadline: requestRow.heroHeadline,
      shortBio: requestRow.shortBio,
      cloudinaryFolder: uniqueCloudinaryFolder,
      gcashQrUrl: requestRow.gcashQrUrl,
      adminPassword: parsed.data.adminPassword,
    });
    await upsertTenantInSheet(tenant);
    updateOnboardingRequestStatus(id, "APPROVED", tenant.id);

    return NextResponse.json({
      ok: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        storeName: tenant.storeName,
        ownerName: tenant.ownerName,
        heroBadge: tenant.heroBadge,
        heroHeadline: tenant.heroHeadline,
        shortBio: tenant.shortBio,
        cloudinaryFolder: tenant.cloudinaryFolder,
        gcashQrUrl: tenant.gcashQrUrl,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
    });
  } catch (error) {
    console.error("POST /api/super-admin/onboarding/[id]/approve error", error);
    const message = error instanceof Error ? error.message : "Failed to approve request";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
