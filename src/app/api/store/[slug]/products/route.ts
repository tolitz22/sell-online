import { NextResponse } from "next/server";
import { resolveTenant, buildTenantSheetsConfig } from "@/lib/tenant-middleware";
import { getAllProductsSafe } from "@/lib/sheets";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const tenant = resolveTenant(slug);
        if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

        const config = buildTenantSheetsConfig(tenant);
        const products = await getAllProductsSafe(config);
        return NextResponse.json({ ok: true, products });
    } catch (error) {
        console.error("GET /api/store/[slug]/products error", error);
        return NextResponse.json({ ok: false, error: "Failed to load products" }, { status: 500 });
    }
}
