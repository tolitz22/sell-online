import { NextResponse } from "next/server";
import { resolveTenant, buildTenantSheetsConfig } from "@/lib/tenant-middleware";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createProductSchema } from "@/lib/schemas";
import { appendProductRow, getAllProductsSafe } from "@/lib/sheets";
import { getProductById } from "@/lib/products";

function slugify(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const tenant = resolveTenant(slug);
        if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

        const authed = await isAdminAuthenticated(tenant);
        if (!authed) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const parsed = createProductSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
                { status: 400 },
            );
        }

        const config = buildTenantSheetsConfig(tenant);
        const existing = await getAllProductsSafe(config);
        const baseId = slugify(parsed.data.name) || `item-${Date.now()}`;

        let id = baseId;
        let i = 2;
        while (getProductById(existing, id)) {
            id = `${baseId}-${i}`;
            i += 1;
        }

        const product = {
            id,
            name: parsed.data.name.trim(),
            category: parsed.data.category.trim(),
            price: parsed.data.price,
            description: parsed.data.description.trim(),
            status: parsed.data.status,
            imageUrl: parsed.data.imageUrl?.trim() ?? "",
        };

        await appendProductRow(config, product);
        return NextResponse.json({ ok: true, product });
    } catch (error) {
        console.error("POST /api/store/[slug]/admin/products error", error);
        return NextResponse.json({ ok: false, error: "Failed to create product" }, { status: 500 });
    }
}
