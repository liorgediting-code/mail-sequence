import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

// Unsubscribe token: HMAC-SHA256(email) truncated to 16 bytes (32 hex chars).
// Format: <leadId>.<token>. Lead ID is included so we can look up the row
// without iterating, but the token still binds to email (server re-derives).

export function unsubToken(leadId: string, email: string): string {
  const h = createHmac("sha256", env.ADMIN_COOKIE_SECRET()).update(`${leadId}:${email}`).digest();
  return h.subarray(0, 16).toString("hex");
}

export function unsubTokenMatches(leadId: string, email: string, token: string): boolean {
  const expected = unsubToken(leadId, email);
  if (expected.length !== token.length) return false;
  try { return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex")); }
  catch { return false; }
}

export function unsubUrl(leadId: string, email: string): string {
  const base = env.PUBLIC_URL();
  const token = unsubToken(leadId, email);
  return `${base}/u/${leadId}.${token}`;
}
