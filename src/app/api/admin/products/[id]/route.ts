import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  void req;
  const { id } = await ctx.params;
  return NextResponse.json(
    { ok: false, error: `Route moved for product ${id}. Use /api/store/{slug}/admin/products/{id}` },
    { status: 410 },
  );
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json(
    { ok: false, error: `Route moved for product ${id}. Use /api/store/{slug}/admin/products/{id}` },
    { status: 410 },
  );
}
