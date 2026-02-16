import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveTenant } from "@/lib/tenant-middleware";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateTenant } from "@/lib/tenant-db";
import { upsertTenantInSheet } from "@/lib/tenant-registry-sheet";

const updateProfileSchema = z.object({
  shortBio: z.string().max(400).optional(),
  gcashQrUrl: z.string().optional(),
  address: z.string().max(300).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = resolveTenant(slug);
  if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const authed = await isAdminAuthenticated(tenant);
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    profile: {
      shortBio: tenant.shortBio ?? "",
      gcashQrUrl: tenant.gcashQrUrl ?? "",
      address: tenant.address ?? "",
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = resolveTenant(slug);
  if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const authed = await isAdminAuthenticated(tenant);
  if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const parsed = updateProfileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  const updated = updateTenant(tenant.id, {
    shortBio: parsed.data.shortBio,
    gcashQrUrl: parsed.data.gcashQrUrl,
    address: parsed.data.address,
  });
  if (!updated) return NextResponse.json({ ok: false, error: "Tenant not found" }, { status: 404 });

  await upsertTenantInSheet(updated);
  return NextResponse.json({
    ok: true,
    profile: {
      shortBio: updated.shortBio ?? "",
      gcashQrUrl: updated.gcashQrUrl ?? "",
      address: updated.address ?? "",
    },
  });
}
