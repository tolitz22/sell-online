import { NextResponse } from "next/server";
import { z } from "zod";
import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import { createTenant, getAllTenants, type Tenant } from "@/lib/tenant-db";
import { upsertTenantInSheet } from "@/lib/tenant-registry-sheet";

const createTenantSchema = z.object({
  slug: z.string().min(2),
  storeName: z.string().min(2),
  ownerName: z.string().min(2),
  heroBadge: z.string().optional().default("Online Store"),
  heroHeadline: z.string().optional().default(""),
  shortBio: z.string().optional().default(""),
  adminPassword: z.string().min(4),
  cloudinaryFolder: z.string().optional().default(""),
  gcashQrUrl: z.string().optional().default(""),
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

export async function GET() {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const tenants = getAllTenants().map(toTenantView);
  return NextResponse.json({ ok: true, tenants });
}

export async function POST(req: Request) {
  const authed = await isSuperAdminAuthenticated();
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = createTenantSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const tenant = createTenant(parsed.data);
    await upsertTenantInSheet(tenant);
    return NextResponse.json({ ok: true, tenant: toTenantView(tenant) });
  } catch (error) {
    console.error("POST /api/super-admin/tenants error", error);
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
