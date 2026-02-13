import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { productStatuses } from "@/lib/schemas";
import { deleteProductById, updateProductById } from "@/lib/sheets";

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  price: z.coerce.number().positive().optional(),
  description: z.string().min(5).max(500).optional(),
  status: z.enum(productStatuses).optional(),
  imageUrl: z.string().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const parsed = updateProductSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const updated = await updateProductById(id, parsed.data);
    if (!updated) return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });

    return NextResponse.json({ ok: true, product: updated });
  } catch (error) {
    console.error("PATCH /api/admin/products/[id] error", error);
    return NextResponse.json({ ok: false, error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params;
    const ok = await deleteProductById(id);
    if (!ok) return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/admin/products/[id] error", error);
    return NextResponse.json({ ok: false, error: "Failed to delete item" }, { status: 500 });
  }
}
