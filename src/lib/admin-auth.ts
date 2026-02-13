import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";

function expectedPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function sessionToken() {
  return crypto.createHash("sha256").update(expectedPassword()).digest("hex");
}

export function isPasswordValid(input: string) {
  const expected = expectedPassword();
  if (!expected) return false;
  return input === expected;
}

export async function setAdminSessionCookie() {
  const token = sessionToken();
  if (!token) throw new Error("Admin password is not configured");

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const token = sessionToken();
  if (!token) return false;

  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value === token;
}
