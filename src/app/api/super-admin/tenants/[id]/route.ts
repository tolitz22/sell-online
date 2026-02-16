import { NextResponse } from "next/server";
import { z } from "zod";
import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import { updateTenant, type Tenant } from "@/lib/tenant-db";
import { upsertTenantInSheet } from "@/lib/tenant-registry-sheet";

const updateTenantSchema = z.object({
  slug: z.string().min(2).optional(),
  storeName: z.string().min(2).optional(),
  ownerName: z.string().min(2).optional(),
  heroBadge: z.string().optional(),
  heroHeadline: z.string().optional(),
  shortBio: z.string().optional(),
  adminPassword: z.string().min(4).optional(),
  cloudinaryFolder: z.string().optional(),
  gcashQrUrl: z.string().optional(),
  isActive: z.boolean().optional(),
});

function toTenantView(tenant: Tenant) {
  return {
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
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const parsed = updateTenantSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const tenant = updateTenant(id, parsed.data);
    if (!tenant) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });
    await upsertTenantInSheet(tenant);

    return NextResponse.json({ ok: true, tenant: toTenantView(tenant) });
  } catch (error) {
    console.error("PATCH /api/super-admin/tenants/[id] error", error);
    const message = error instanceof Error ? error.message : "Failed to update tenant";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
