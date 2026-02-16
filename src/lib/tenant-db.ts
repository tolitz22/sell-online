import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";

export type Tenant = {
  id: string;
  slug: string;
  storeName: string;
  ownerName: string;
  heroBadge: string;
  heroHeadline: string;
  shortBio: string;
  address: string;
  adminPasswordHash: string;
  cloudinaryFolder: string;
  gcashQrUrl: string;
  isActive: boolean;
  createdAt: string;
};

export type OnboardingRequest = {
  id: string;
  slug: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  heroHeadline: string;
  shortBio: string;
  expectedProducts: string;
  notes: string;
  cloudinaryFolder: string;
  gcashQrUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedTenantId: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type TenantRow = {
  id: string;
  slug: string;
  store_name: string;
  owner_name: string;
  hero_badge: string;
  hero_headline: string;
  short_bio: string;
  address: string;
  admin_password_hash: string;
  cloudinary_folder: string;
  gcash_qr_url: string;
  is_active: number;
  created_at: string;
};

type OnboardingRequestRow = {
  id: string;
  slug: string;
  store_name: string;
  owner_name: string;
  email: string;
  phone: string;
  hero_headline: string;
  short_bio: string;
  expected_products: string;
  notes: string;
  cloudinary_folder: string;
  gcash_qr_url: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewed_tenant_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function resolveDbPath() {
  const configured = process.env.DATABASE_PATH?.trim();
  // Netlify runtime has a writable temp filesystem at /tmp.
  if (process.env.NETLIFY) {
    if (!configured) return "/tmp/tenants.db";
    if (/^(\.\/)?data[\\/]/i.test(configured)) return "/tmp/tenants.db";
    return configured;
  }
  if (configured) return configured;
  return path.join(process.cwd(), "data", "tenants.db");
}

const DB_PATH = resolveDbPath();

let _db: Database.Database | null = null;

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function getDb(): Database.Database {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.exec(`
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
        gcash_qr_url        TEXT DEFAULT '',
        is_active           INTEGER DEFAULT 1,
        created_at          TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS onboarding_requests (
        id                TEXT PRIMARY KEY,
        slug              TEXT NOT NULL,
        store_name        TEXT NOT NULL,
        owner_name        TEXT NOT NULL,
        email             TEXT NOT NULL,
        phone             TEXT NOT NULL,
        hero_headline     TEXT DEFAULT '',
        short_bio         TEXT DEFAULT '',
        expected_products TEXT DEFAULT '',
        notes             TEXT DEFAULT '',
        cloudinary_folder TEXT DEFAULT '',
        gcash_qr_url      TEXT DEFAULT '',
        status            TEXT NOT NULL DEFAULT 'PENDING',
        reviewed_tenant_id TEXT,
        reviewed_at       TEXT,
        created_at        TEXT DEFAULT (datetime('now'))
      );
    `);
    if (!hasColumn(_db, "tenants", "gcash_qr_url")) {
      _db.exec(`ALTER TABLE tenants ADD COLUMN gcash_qr_url TEXT DEFAULT '';`);
    }
    if (!hasColumn(_db, "tenants", "address")) {
      _db.exec(`ALTER TABLE tenants ADD COLUMN address TEXT DEFAULT '';`);
    }
    if (!hasColumn(_db, "onboarding_requests", "gcash_qr_url")) {
      _db.exec(`ALTER TABLE onboarding_requests ADD COLUMN gcash_qr_url TEXT DEFAULT '';`);
    }
  }
  return _db;
}

function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    storeName: row.store_name,
    ownerName: row.owner_name,
    heroBadge: row.hero_badge,
    heroHeadline: row.hero_headline,
    shortBio: row.short_bio,
    address: row.address ?? "",
    adminPasswordHash: row.admin_password_hash,
    cloudinaryFolder: row.cloudinary_folder,
    gcashQrUrl: row.gcash_qr_url ?? "",
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

function rowToOnboardingRequest(row: OnboardingRequestRow): OnboardingRequest {
  return {
    id: row.id,
    slug: row.slug,
    storeName: row.store_name,
    ownerName: row.owner_name,
    email: row.email,
    phone: row.phone,
    heroHeadline: row.hero_headline ?? "",
    shortBio: row.short_bio ?? "",
    expectedProducts: row.expected_products ?? "",
    notes: row.notes ?? "",
    cloudinaryFolder: row.cloudinary_folder ?? "",
    gcashQrUrl: row.gcash_qr_url ?? "",
    status: row.status,
    reviewedTenantId: row.reviewed_tenant_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function getTenantBySlug(slug: string): Tenant | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tenants WHERE slug = ? AND is_active = 1").get(slug) as TenantRow | undefined;
  return row ? rowToTenant(row) : null;
}

export function getTenantById(id: string): Tenant | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tenants WHERE id = ?").get(id) as TenantRow | undefined;
  return row ? rowToTenant(row) : null;
}

export function getAllTenants(): Tenant[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM tenants ORDER BY created_at DESC").all() as TenantRow[];
  return rows.map(rowToTenant);
}

export function getActiveTenants(): Tenant[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM tenants WHERE is_active = 1 ORDER BY created_at DESC").all() as TenantRow[];
  return rows.map(rowToTenant);
}

export type CreateTenantInput = {
  slug: string;
  storeName: string;
  ownerName: string;
  heroBadge?: string;
  heroHeadline?: string;
  shortBio?: string;
  address?: string;
  adminPassword: string;
  cloudinaryFolder?: string;
  gcashQrUrl?: string;
};

export function createTenant(input: CreateTenantInput): Tenant {
  const db = getDb();
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(input.adminPassword);

  db.prepare(`
    INSERT INTO tenants (id, slug, store_name, owner_name, hero_badge, hero_headline, short_bio, address, admin_password_hash, cloudinary_folder, gcash_qr_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.slug,
    input.storeName,
    input.ownerName,
    input.heroBadge ?? "Online Store",
    input.heroHeadline ?? "",
    input.shortBio ?? "",
    input.address ?? "",
    passwordHash,
    input.cloudinaryFolder ?? "",
    input.gcashQrUrl ?? "",
  );

  return getTenantById(id)!;
}

export type UpdateTenantInput = Partial<Omit<CreateTenantInput, "adminPassword">> & {
  adminPassword?: string;
  isActive?: boolean;
};

export function updateTenant(id: string, input: UpdateTenantInput): Tenant | null {
  const db = getDb();
  const existing = getTenantById(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (input.slug !== undefined) { updates.push("slug = ?"); values.push(input.slug); }
  if (input.storeName !== undefined) { updates.push("store_name = ?"); values.push(input.storeName); }
  if (input.ownerName !== undefined) { updates.push("owner_name = ?"); values.push(input.ownerName); }
  if (input.heroBadge !== undefined) { updates.push("hero_badge = ?"); values.push(input.heroBadge); }
  if (input.heroHeadline !== undefined) { updates.push("hero_headline = ?"); values.push(input.heroHeadline); }
  if (input.shortBio !== undefined) { updates.push("short_bio = ?"); values.push(input.shortBio); }
  if (input.address !== undefined) { updates.push("address = ?"); values.push(input.address); }
  if (input.cloudinaryFolder !== undefined) { updates.push("cloudinary_folder = ?"); values.push(input.cloudinaryFolder); }
  if (input.gcashQrUrl !== undefined) { updates.push("gcash_qr_url = ?"); values.push(input.gcashQrUrl); }
  if (input.adminPassword !== undefined) { updates.push("admin_password_hash = ?"); values.push(hashPassword(input.adminPassword)); }
  if (input.isActive !== undefined) { updates.push("is_active = ?"); values.push(input.isActive ? 1 : 0); }

  if (updates.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE tenants SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return getTenantById(id);
}

export function deleteTenant(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM tenants WHERE id = ?").run(id);
  return result.changes > 0;
}

export type CreateOnboardingRequestInput = {
  slug: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  heroHeadline?: string;
  shortBio?: string;
  expectedProducts?: string;
  notes?: string;
  cloudinaryFolder?: string;
  gcashQrUrl?: string;
};

export function createOnboardingRequest(input: CreateOnboardingRequestInput): OnboardingRequest {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO onboarding_requests (
      id, slug, store_name, owner_name, email, phone, hero_headline, short_bio, expected_products, notes, cloudinary_folder, gcash_qr_url, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(
    id,
    input.slug,
    input.storeName,
    input.ownerName,
    input.email,
    input.phone,
    input.heroHeadline ?? "",
    input.shortBio ?? "",
    input.expectedProducts ?? "",
    input.notes ?? "",
    input.cloudinaryFolder ?? "",
    input.gcashQrUrl ?? "",
  );

  return getOnboardingRequestById(id)!;
}

export function getOnboardingRequestById(id: string): OnboardingRequest | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM onboarding_requests WHERE id = ?").get(id) as OnboardingRequestRow | undefined;
  return row ? rowToOnboardingRequest(row) : null;
}

export function getPendingOnboardingRequests(): OnboardingRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM onboarding_requests WHERE status = 'PENDING' ORDER BY created_at ASC").all() as OnboardingRequestRow[];
  return rows.map(rowToOnboardingRequest);
}

export function getAllOnboardingRequests(): OnboardingRequest[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM onboarding_requests ORDER BY created_at DESC").all() as OnboardingRequestRow[];
  return rows.map(rowToOnboardingRequest);
}

export function updateOnboardingRequestStatus(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewedTenantId: string | null = null,
): OnboardingRequest | null {
  const db = getDb();
  const exists = getOnboardingRequestById(id);
  if (!exists) return null;

  db.prepare(`
    UPDATE onboarding_requests
    SET status = ?, reviewed_tenant_id = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `).run(status, reviewedTenantId, id);

  return getOnboardingRequestById(id);
}
