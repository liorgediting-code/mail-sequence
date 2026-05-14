// Centralized env-var access. Throws on first access if missing so failures are
// loud and not silently coerced to undefined.

function req(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function opt(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

export const env = {
  // Supabase
  SUPABASE_URL:              () => req("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: () => req("SUPABASE_SERVICE_ROLE_KEY"),

  // GAS email
  GAS_EMAIL_WEBHOOK: () => req("GAS_EMAIL_WEBHOOK"),
  GAS_EMAIL_SECRET:  () => req("GAS_EMAIL_SECRET"),
  FROM_NAME:         () => opt("FROM_NAME", "Liav"),
  // Optional: send "as" this address (must be a verified alias of the
  // authenticated Gmail account behind GAS). Empty = send from the
  // GAS-authenticated account's primary address.
  FROM_EMAIL:        () => opt("FROM_EMAIL", ""),
  GMAIL_DAILY_QUOTA: () => Number(opt("GMAIL_DAILY_QUOTA", "90")),

  // Admin
  ADMIN_PASSWORD:      () => req("ADMIN_PASSWORD"),
  ADMIN_COOKIE_SECRET: () => req("ADMIN_COOKIE_SECRET"),

  // Cron + ingest
  CRON_SECRET:   () => req("CRON_SECRET"),
  INGEST_SECRET: () => req("INGEST_SECRET"),

  // Master arm switch. Set to "true" only when you want the cron to actually
  // send mail. Any other value (default empty) → cron runs but sends nothing.
  // This is a hard guarantee independent of per-template `enabled` flags and
  // per-lead status — useful when testing, during incident response, or when
  // you simply haven't gone live yet.
  SENDING_ENABLED: () => opt("SENDING_ENABLED", "").toLowerCase() === "true",

  // Public origin
  PUBLIC_URL: () => opt("PUBLIC_URL", "").replace(/\/$/, ""),
};
