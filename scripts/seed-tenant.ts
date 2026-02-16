import { google } from "googleapis";
import { createTenant, getTenantBySlug } from "../src/lib/tenant-db";

type GoogleConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  spreadsheetId: string;
  ordersSheetName: string;
  productsSheetName: string;
};

const PRODUCTS_HEADER = [
  "tenantId",
  "id",
  "name",
  "category",
  "price",
  "description",
  "status",
  "imageUrl",
];

const ORDERS_HEADER = [
  "tenantId",
  "timestamp",
  "orderId",
  "itemId",
  "itemName",
  "price",
  "quantity",
  "fullName",
  "email",
  "phone",
  "address",
  "notes",
  "paymentStatus",
];

function getEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getGoogleConfig(): GoogleConfig {
  return {
    serviceAccountEmail: getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    privateKey: getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    spreadsheetId: getEnv("GOOGLE_SHEETS_SPREADSHEET_ID"),
    ordersSheetName: getEnv("GOOGLE_SHEETS_SHEET_NAME", "orders"),
    productsSheetName: getEnv("GOOGLE_SHEETS_PRODUCTS_SHEET_NAME", "products"),
  };
}

function getSeedValues() {
  const ownerName = getEnv("NEXT_PUBLIC_OWNER_NAME", "Store Owner");
  const slug = slugify(getEnv("SEED_TENANT_SLUG", ownerName)) || "default-store";
  const storeName = getEnv("SEED_STORE_NAME", `${ownerName}'s Store`);
  const heroBadge = getEnv("NEXT_PUBLIC_HERO_BADGE", "Online Store");
  const heroHeadline = getEnv("NEXT_PUBLIC_HERO_HEADLINE", "");
  const shortBio = getEnv("NEXT_PUBLIC_SITE_BIO", "");
  const adminPassword = getEnv("SEED_ADMIN_PASSWORD", getEnv("ADMIN_PASSWORD"));
  const cloudinaryFolder = getEnv("SEED_CLOUDINARY_FOLDER", `${getEnv("CLOUDINARY_UPLOAD_FOLDER", "products")}/${slug}`);

  if (!adminPassword) {
    throw new Error("Missing ADMIN_PASSWORD or SEED_ADMIN_PASSWORD");
  }

  return {
    slug,
    storeName,
    ownerName,
    heroBadge,
    heroHeadline,
    shortBio,
    adminPassword,
    cloudinaryFolder,
  };
}

function seedTenantInStore() {
  const seed = getSeedValues();
  const existing = getTenantBySlug(seed.slug);

  if (existing) {
    console.log(`Tenant already exists: ${seed.slug} (id: ${existing.id})`);
    return;
  }

  const tenant = createTenant({
    slug: seed.slug,
    storeName: seed.storeName,
    ownerName: seed.ownerName,
    heroBadge: seed.heroBadge,
    heroHeadline: seed.heroHeadline,
    shortBio: seed.shortBio,
    address: "",
    adminPassword: seed.adminPassword,
    cloudinaryFolder: seed.cloudinaryFolder,
  });

  console.log(`Seeded tenant: ${seed.slug} (id: ${tenant.id})`);
}

async function updateSheetHeaders() {
  const config = getGoogleConfig();
  if (!config.serviceAccountEmail || !config.privateKey || !config.spreadsheetId) {
    console.log("Skipped Google Sheet header update: missing Google Sheets env vars.");
    return;
  }

  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.productsSheetName}!A1:H1`,
    valueInputOption: "RAW",
    requestBody: { values: [PRODUCTS_HEADER] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.ordersSheetName}!A1:M1`,
    valueInputOption: "RAW",
    requestBody: { values: [ORDERS_HEADER] },
  });

  console.log("Updated Google Sheet headers for products and orders tabs.");
}

async function main() {
  seedTenantInStore();
  await updateSheetHeaders();
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
