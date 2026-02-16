import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant-middleware";
import { isPasswordValid, setAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const tenant = resolveTenant(slug);
        if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

        const json = await req.json();
        const password = String(json?.password ?? "");

        if (!isPasswordValid(tenant, password)) {
            return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
        }

        await setAdminSessionCookie(tenant);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("POST /api/store/[slug]/admin/login error", error);
        return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
}
