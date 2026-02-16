import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return NextResponse.json(
    { ok: false, error: `Route moved for order ${orderId}. Use /api/store/{slug}/orders/{orderId}` },
    { status: 410 },
  );
}

export async function PATCH(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  void req;
  const { orderId } = await params;
  return NextResponse.json(
    { ok: false, error: `Route moved for order ${orderId}. Use /api/store/{slug}/orders/{orderId}` },
    { status: 410 },
  );
}
