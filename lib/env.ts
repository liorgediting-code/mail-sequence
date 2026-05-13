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
  GMAIL_DAILY_QUOTA: () => Number(opt("GMAIL_DAILY_QUOTA", "90")),

  // Admin
  ADMIN_PASSWORD:      () => req("ADMIN_PASSWORD"),
  ADMIN_COOKIE_SECRET: () => req("ADMIN_COOKIE_SECRET"),

  // Cron + ingest
  CRON_SECRET:   () => req("CRON_SECRET"),
  INGEST_SECRET: () => req("INGEST_SECRET"),

  // Public origin
  PUBLIC_URL: () => opt("PUBLIC_URL", "").replace(/\/$/, ""),
};
