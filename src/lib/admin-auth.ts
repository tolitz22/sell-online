import crypto from "crypto";
import { cookies } from "next/headers";
import { hashPassword, type Tenant } from "@/lib/tenant-db";

function cookieName(slug: string) {
  return `admin_session_${slug}`;
}

function sessionToken(tenant: Tenant) {
  return crypto.createHash("sha256").update(tenant.adminPasswordHash).digest("hex");
}

export function isPasswordValid(tenant: Tenant, input: string) {
  const inputHash = hashPassword(input);
  return inputHash === tenant.adminPasswordHash;
}

export async function setAdminSessionCookie(tenant: Tenant) {
  const token = sessionToken(tenant);
  const store = await cookies();
  store.set(cookieName(tenant.slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie(slug: string) {
  const store = await cookies();
  store.delete(cookieName(slug));
}

export async function isAdminAuthenticated(tenant: Tenant) {
  const token = sessionToken(tenant);
  if (!token) return false;

  const store = await cookies();
  const value = store.get(cookieName(tenant.slug))?.value;
  return value === token;
}

// --- Super-admin auth ---

const SUPER_COOKIE_NAME = "super_admin_session";

function superAdminToken() {
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim();
  if (!password) return "";
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function isSuperAdminPasswordValid(input: string) {
  const expected = process.env.SUPER_ADMIN_PASSWORD?.trim() ?? "";
  if (!expected) return false;
  return input === expected;
}

export async function setSuperAdminSessionCookie() {
  const token = superAdminToken();
  if (!token) throw new Error("Super admin password is not configured");

  const store = await cookies();
  store.set(SUPER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSuperAdminSessionCookie() {
  const store = await cookies();
  store.delete(SUPER_COOKIE_NAME);
}

export async function isSuperAdminAuthenticated() {
  const token = superAdminToken();
  if (!token) return false;

  const store = await cookies();
  const value = store.get(SUPER_COOKIE_NAME)?.value;
  return value === token;
}
