import crypto from "crypto";
import fs from "fs";
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

type StoreData = {
  tenants: Tenant[];
  onboardingRequests: OnboardingRequest[];
};

function resolveStorePath() {
  const configured = process.env.DATABASE_PATH?.trim();

  if (process.env.NETLIFY) {
    if (!configured) return "/tmp/tenants.json";
    if (/^(\.\/)?data[\\/]/i.test(configured)) return "/tmp/tenants.json";
    if (/\.db$/i.test(configured)) return configured.replace(/\.db$/i, ".json");
    return configured;
  }

  if (configured) {
    const fullPath = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
    return /\.db$/i.test(fullPath) ? fullPath.replace(/\.db$/i, ".json") : fullPath;
  }

  return path.join(process.cwd(), "data", "tenants.json");
}

const STORE_PATH = resolveStorePath();

let cache: StoreData | null = null;

function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ tenants: [], onboardingRequests: [] }, null, 2), "utf-8");
  }
}

function loadStore(): StoreData {
  if (cache) return cache;

  ensureStoreFile();

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    cache = {
      tenants: Array.isArray(parsed.tenants) ? parsed.tenants : [],
      onboardingRequests: Array.isArray(parsed.onboardingRequests) ? parsed.onboardingRequests : [],
    };
  } catch {
    cache = { tenants: [], onboardingRequests: [] };
    persistStore(cache);
  }

  return cache;
}

function persistStore(data: StoreData) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  cache = data;
}

function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T) {
  return b.createdAt.localeCompare(a.createdAt);
}

function byCreatedAtAsc<T extends { createdAt: string }>(a: T, b: T) {
  return a.createdAt.localeCompare(b.createdAt);
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function getTenantBySlug(slug: string): Tenant | null {
  const store = loadStore();
  return store.tenants.find((tenant) => tenant.slug === slug && tenant.isActive) ?? null;
}

export function getTenantById(id: string): Tenant | null {
  const store = loadStore();
  return store.tenants.find((tenant) => tenant.id === id) ?? null;
}

export function getAllTenants(): Tenant[] {
  const store = loadStore();
  return [...store.tenants].sort(byCreatedAtDesc);
}

export function getActiveTenants(): Tenant[] {
  const store = loadStore();
  return store.tenants.filter((tenant) => tenant.isActive).sort(byCreatedAtDesc);
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
  const store = loadStore();

  if (store.tenants.some((tenant) => tenant.slug === input.slug)) {
    throw new Error("Tenant slug already exists");
  }

  const tenant: Tenant = {
    id: crypto.randomUUID(),
    slug: input.slug,
    storeName: input.storeName,
    ownerName: input.ownerName,
    heroBadge: input.heroBadge ?? "Online Store",
    heroHeadline: input.heroHeadline ?? "",
    shortBio: input.shortBio ?? "",
    address: input.address ?? "",
    adminPasswordHash: hashPassword(input.adminPassword),
    cloudinaryFolder: input.cloudinaryFolder ?? "",
    gcashQrUrl: input.gcashQrUrl ?? "",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  persistStore({ ...store, tenants: [...store.tenants, tenant] });
  return tenant;
}

export type UpdateTenantInput = Partial<Omit<CreateTenantInput, "adminPassword">> & {
  adminPassword?: string;
  isActive?: boolean;
};

export function updateTenant(id: string, input: UpdateTenantInput): Tenant | null {
  const store = loadStore();
  const index = store.tenants.findIndex((tenant) => tenant.id === id);
  if (index === -1) return null;

  const existing = store.tenants[index];
  const updated: Tenant = {
    ...existing,
    slug: input.slug ?? existing.slug,
    storeName: input.storeName ?? existing.storeName,
    ownerName: input.ownerName ?? existing.ownerName,
    heroBadge: input.heroBadge ?? existing.heroBadge,
    heroHeadline: input.heroHeadline ?? existing.heroHeadline,
    shortBio: input.shortBio ?? existing.shortBio,
    address: input.address ?? existing.address,
    cloudinaryFolder: input.cloudinaryFolder ?? existing.cloudinaryFolder,
    gcashQrUrl: input.gcashQrUrl ?? existing.gcashQrUrl,
    isActive: input.isActive ?? existing.isActive,
    adminPasswordHash: input.adminPassword ? hashPassword(input.adminPassword) : existing.adminPasswordHash,
  };

  if (updated.slug !== existing.slug && store.tenants.some((tenant) => tenant.id !== id && tenant.slug === updated.slug)) {
    throw new Error("Tenant slug already exists");
  }

  const tenants = [...store.tenants];
  tenants[index] = updated;
  persistStore({ ...store, tenants });
  return updated;
}

export function deleteTenant(id: string): boolean {
  const store = loadStore();
  const tenants = store.tenants.filter((tenant) => tenant.id !== id);
  if (tenants.length === store.tenants.length) return false;
  persistStore({ ...store, tenants });
  return true;
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
  const store = loadStore();

  const request: OnboardingRequest = {
    id: crypto.randomUUID(),
    slug: input.slug,
    storeName: input.storeName,
    ownerName: input.ownerName,
    email: input.email,
    phone: input.phone,
    heroHeadline: input.heroHeadline ?? "",
    shortBio: input.shortBio ?? "",
    expectedProducts: input.expectedProducts ?? "",
    notes: input.notes ?? "",
    cloudinaryFolder: input.cloudinaryFolder ?? "",
    gcashQrUrl: input.gcashQrUrl ?? "",
    status: "PENDING",
    reviewedTenantId: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
  };

  persistStore({ ...store, onboardingRequests: [...store.onboardingRequests, request] });
  return request;
}

export function getOnboardingRequestById(id: string): OnboardingRequest | null {
  const store = loadStore();
  return store.onboardingRequests.find((request) => request.id === id) ?? null;
}

export function getPendingOnboardingRequests(): OnboardingRequest[] {
  const store = loadStore();
  return store.onboardingRequests.filter((request) => request.status === "PENDING").sort(byCreatedAtAsc);
}

export function getAllOnboardingRequests(): OnboardingRequest[] {
  const store = loadStore();
  return [...store.onboardingRequests].sort(byCreatedAtDesc);
}

export function updateOnboardingRequestStatus(
  id: string,
  status: "APPROVED" | "REJECTED",
  reviewedTenantId: string | null = null,
): OnboardingRequest | null {
  const store = loadStore();
  const index = store.onboardingRequests.findIndex((request) => request.id === id);
  if (index === -1) return null;

  const existing = store.onboardingRequests[index];
  const updated: OnboardingRequest = {
    ...existing,
    status,
    reviewedTenantId,
    reviewedAt: new Date().toISOString(),
  };

  const onboardingRequests = [...store.onboardingRequests];
  onboardingRequests[index] = updated;
  persistStore({ ...store, onboardingRequests });
  return updated;
}
