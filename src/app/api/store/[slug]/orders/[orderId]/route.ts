import { NextResponse } from "next/server";
import { resolveTenant, buildTenantSheetsConfig } from "@/lib/tenant-middleware";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { updateStatusSchema } from "@/lib/schemas";
import { getOrderById, updateOrderPaymentStatus } from "@/lib/sheets";

export async function GET(
    _: Request,
    { params }: { params: Promise<{ slug: string; orderId: string }> },
) {
    try {
        const { slug, orderId } = await params;
        const tenant = resolveTenant(slug);
        if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

        const config = buildTenantSheetsConfig(tenant);
        const order = await getOrderById(config, orderId);

        if (!order) {
            return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({
            ok: true,
            order: {
                orderId: order.orderId,
                itemName: order.itemName,
                quantity: order.quantity,
                paymentStatus: order.paymentStatus,
            },
        });
    } catch (error) {
        console.error("GET /api/store/[slug]/orders/[orderId] error", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ slug: string; orderId: string }> },
) {
    try {
        const { slug, orderId } = await params;
        const tenant = resolveTenant(slug);
        if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

        const authed = await isAdminAuthenticated(tenant);
        if (!authed) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const parsed = updateStatusSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
                { status: 400 },
            );
        }

        const config = buildTenantSheetsConfig(tenant);
        const updated = await updateOrderPaymentStatus(config, orderId, parsed.data.paymentStatus);
        if (!updated) {
            return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("PATCH /api/store/[slug]/orders/[orderId] error", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}
