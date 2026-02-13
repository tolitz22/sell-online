import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "File must be an image" }, { status: 400 });
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const extFromType = file.type.split("/")[1] || "jpg";
    const base = safeName(file.name.replace(/\.[^.]+$/, "")) || "product";
    const fileName = `${Date.now()}-${base}.${extFromType}`;
    const relativePath = `/uploads/products/${fileName}`;

    const absoluteDir = path.join(process.cwd(), "public", "uploads", "products");
    await mkdir(absoluteDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(absoluteDir, fileName), buffer);

    return NextResponse.json({ ok: true, imageUrl: relativePath });
  } catch (error) {
    console.error("POST /api/admin/products/upload error", error);
    return NextResponse.json({ ok: false, error: "Failed to upload image" }, { status: 500 });
  }
}
