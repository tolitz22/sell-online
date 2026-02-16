import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    await clearAdminSessionCookie(slug);
    return NextResponse.json({ ok: true });
}
