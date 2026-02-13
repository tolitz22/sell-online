import { NextResponse } from "next/server";
import { getProductById } from "@/lib/products";
import { orderSchema } from "@/lib/schemas";
import { appendOrderRow, getAllProductsSafe } from "@/lib/sheets";
import { generateOrderId } from "@/lib/utils";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map<string, number[]>();

function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) ?? [];
  const fresh = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, fresh);
    return false;
  }

  fresh.push(now);
  rateLimitStore.set(key, fresh);
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const allowed = checkRateLimit(ip);

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    const json = await req.json();
    const parsed = orderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const products = await getAllProductsSafe();
    const product = getProductById(products, parsed.data.itemId);
    if (!product) {
      return NextResponse.json({ ok: false, error: "Item not found" }, { status: 404 });
    }

    if (product.status !== "AVAILABLE") {
      return NextResponse.json({ ok: false, error: "Item is sold out" }, { status: 400 });
    }

    const orderId = generateOrderId();

    await appendOrderRow({
      timestamp: new Date().toISOString(),
      orderId,
      itemId: product.id,
      itemName: product.name,
      price: product.price,
      quantity: parsed.data.quantity,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      notes: parsed.data.notes ?? "",
      paymentStatus: "PENDING_PROOF",
    });

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error("POST /api/orders error", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
