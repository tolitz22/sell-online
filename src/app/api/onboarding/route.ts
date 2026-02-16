import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOnboardingRequest,
  getAllOnboardingRequests,
  getAllTenants,
  getPendingOnboardingRequests,
} from "@/lib/tenant-db";

const onboardingSchema = z.object({
  storeName: z.string().min(2, "Store name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  heroHeadline: z.string().max(150).optional().default(""),
  shortBio: z.string().max(300).optional().default(""),
  expectedProducts: z.string().max(200).optional().default(""),
  notes: z.string().max(600).optional().default(""),
  gcashQrUrl: z.string().url("Valid QR image URL is required"),
});

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueValue(base: string, existing: Set<string>) {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

export async function POST(req: Request) {
  try {
    const parsed = onboardingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const slugBase = normalizeSlug(parsed.data.storeName);
    const slug = slugBase;
    if (slug.length < 2) {
      return NextResponse.json({ ok: false, error: "Slug must be at least 2 characters" }, { status: 400 });
    }

    const existingSlugs = new Set<string>([
      ...getAllTenants().map((tenant) => tenant.slug),
      ...getPendingOnboardingRequests().map((request) => request.slug),
    ]);
    const uniqueSlug = uniqueValue(slug, existingSlugs);

    const defaultRootFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "sell-online/products";
    const folderBase = `${defaultRootFolder}/${uniqueSlug}`;
    const existingFolders = new Set<string>([
      ...getAllTenants().map((tenant) => tenant.cloudinaryFolder).filter(Boolean),
      ...getAllOnboardingRequests().map((request) => request.cloudinaryFolder).filter(Boolean),
    ]);
    const uniqueFolder = uniqueValue(folderBase, existingFolders);

    const requestRow = createOnboardingRequest({
      ...parsed.data,
      slug: uniqueSlug,
      cloudinaryFolder: uniqueFolder,
      gcashQrUrl: parsed.data.gcashQrUrl,
    });

    return NextResponse.json({ ok: true, requestId: requestRow.id, slug: requestRow.slug });
  } catch (error) {
    console.error("POST /api/onboarding error", error);
    return NextResponse.json({ ok: false, error: "Failed to submit onboarding request" }, { status: 500 });
  }
}
