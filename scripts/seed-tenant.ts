import Database from "better-sqlite3";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { google } from "googleapis";

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

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDatabasePath() {
  const configured = getEnv("DATABASE_PATH");
  if (!configured) return path.join(process.cwd(), "data", "tenants.db");
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
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
  const cloudinaryFolder = getEnv("SEED_CLOUDINARY_FOLDER", `${getEnv("CLOUDINARY_UPLOAD_FOLDER", "sell-online/products")}/${slug}`);

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

function ensureTenantTable(db: Database.Database) {
  db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id                  TEXT PRIMARY KEY,
        slug                TEXT UNIQUE NOT NULL,
        store_name          TEXT NOT NULL,
        owner_name          TEXT NOT NULL,
        hero_badge          TEXT DEFAULT 'Online Store',
        hero_headline       TEXT DEFAULT '',
        short_bio           TEXT DEFAULT '',
        address             TEXT DEFAULT '',
        admin_password_hash TEXT NOT NULL,
        cloudinary_folder   TEXT DEFAULT '',
        is_active           INTEGER DEFAULT 1,
        created_at          TEXT DEFAULT (datetime('now'))
      );
  `);
}

function seedTenantInDatabase() {
  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const db = new Database(dbPath);
  ensureTenantTable(db);

  const seed = getSeedValues();
  const existing = db.prepare("SELECT id FROM tenants WHERE slug = ?").get(seed.slug) as { id: string } | undefined;

  if (existing) {
    console.log(`Tenant already exists: ${seed.slug} (id: ${existing.id})`);
    return;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO tenants (
      id, slug, store_name, owner_name, hero_badge, hero_headline, short_bio, address, admin_password_hash, cloudinary_folder, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    id,
    seed.slug,
    seed.storeName,
    seed.ownerName,
    seed.heroBadge,
    seed.heroHeadline,
    seed.shortBio,
    "",
    hashPassword(seed.adminPassword),
    seed.cloudinaryFolder,
  );

  console.log(`Seeded tenant: ${seed.slug} (id: ${id})`);
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
  seedTenantInDatabase();
  await updateSheetHeaders();
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exit(1);
});
