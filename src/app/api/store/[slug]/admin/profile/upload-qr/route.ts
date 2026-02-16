import { NextResponse } from "next/server";
import crypto from "crypto";
import { resolveTenant } from "@/lib/tenant-middleware";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getCloudinaryUploadRoot } from "@/lib/runtime-env";

export const runtime = "nodejs";

function requiredEnv(name: "CLOUDINARY_CLOUD_NAME" | "CLOUDINARY_API_KEY" | "CLOUDINARY_API_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getUploadFolder(tenantFolder?: string) {
  const root = tenantFolder || getCloudinaryUploadRoot();
  return `${root}/store-profile/qr`;
}

function buildSignature(folder: string, publicId: string, timestamp: number, apiSecret: string) {
  const toSign =
    `folder=${folder}&overwrite=false&public_id=${publicId}&timestamp=${timestamp}&unique_filename=false${apiSecret}`;
  return crypto.createHash("sha1").update(toSign).digest("hex");
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const tenant = resolveTenant(slug);
    if (!tenant) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

    const authed = await isAdminAuthenticated(tenant);
    if (!authed) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ ok: false, error: "File must be an image" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const cloudName = requiredEnv("CLOUDINARY_CLOUD_NAME");
    const apiKey = requiredEnv("CLOUDINARY_API_KEY");
    const apiSecret = requiredEnv("CLOUDINARY_API_SECRET");
    const folder = getUploadFolder(tenant.cloudinaryFolder);
    const publicId = `gcash-qr-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = buildSignature(folder, publicId, timestamp, apiSecret);

    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("api_key", apiKey);
    uploadForm.append("timestamp", String(timestamp));
    uploadForm.append("signature", signature);
    uploadForm.append("folder", folder);
    uploadForm.append("public_id", publicId);
    uploadForm.append("overwrite", "false");
    uploadForm.append("unique_filename", "false");

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadForm,
    });

    const uploadData = (await uploadRes.json()) as { secure_url?: string; error?: { message?: string } };
    if (!uploadRes.ok || !uploadData?.secure_url) {
      return NextResponse.json({ ok: false, error: uploadData?.error?.message ?? "Upload failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imageUrl: uploadData.secure_url });
  } catch (error) {
    console.error("POST /api/store/[slug]/admin/profile/upload-qr error", error);
    const message = error instanceof Error ? error.message : "Failed to upload QR";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
