import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
  try {
    const authed = await isAdminAuthenticated();
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

    const existing = await getAllProductsSafe();
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

    await appendProductRow(product);
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("POST /api/admin/products error", error);
    return NextResponse.json({ ok: false, error: "Failed to create product" }, { status: 500 });
  }
}
