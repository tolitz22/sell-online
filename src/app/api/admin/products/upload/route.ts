import { NextResponse } from "next/server";
import { Readable } from "stream";
import { google } from "googleapis";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function requiredEnv(name: "GOOGLE_SERVICE_ACCOUNT_EMAIL" | "GOOGLE_PRIVATE_KEY" | "GOOGLE_DRIVE_PRODUCTS_FOLDER_ID") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const stream = Readable.from(buffer);

    const drive = getDriveClient();
    const folderId = requiredEnv("GOOGLE_DRIVE_PRODUCTS_FOLDER_ID");

    const upload = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: file.type,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id",
    });

    const fileId = upload.data.id;
    if (!fileId) throw new Error("Failed to create Google Drive file");

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return NextResponse.json({ ok: true, imageUrl });
  } catch (error) {
    console.error("POST /api/admin/products/upload error", error);
    return NextResponse.json({ ok: false, error: "Failed to upload image" }, { status: 500 });
  }
}
