// HMAC-signed admin session cookie. No DB, no library.
// Cookie value: base64(payload) + "." + base64(hmac-sha256(secret, payload))
// Payload is JSON: { exp: unix-seconds }

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const COOKIE_NAME = "ms_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_COOKIE_SECRET()).update(payload).digest("base64url");
}

export function makeSessionToken(): string {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS });
  const p = b64url(payload);
  const s = sign(payload);
  return `${p}.${s}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [p, s] = token.split(".");
  if (!p || !s) return false;
  let payload: string;
  try { payload = Buffer.from(p, "base64url").toString(); } catch { return false; }
  const expected = sign(payload);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(payload);
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export function setSessionCookie() {
  cookies().set({
    name: COOKIE_NAME,
    value: makeSessionToken(),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie() {
  cookies().set({ name: COOKIE_NAME, value: "", httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export function isAdminAuthed(): boolean {
  return verifySessionToken(cookies().get(COOKIE_NAME)?.value);
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME };
