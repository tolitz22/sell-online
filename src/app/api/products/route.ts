import { NextResponse } from "next/server";
import { getAllProductsSafe } from "@/lib/sheets";

export async function GET() {
  try {
    const products = await getAllProductsSafe();
    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error("GET /api/products error", error);
    return NextResponse.json({ ok: false, error: "Failed to load products" }, { status: 500 });
  }
}
