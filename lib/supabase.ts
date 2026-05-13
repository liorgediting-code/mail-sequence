import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let _client: SupabaseClient | null = null;

/** Server-only Supabase client. Uses service-role key — NEVER call from a
 *  client component or expose it in a public route response. */
export function supa(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL(), env.SUPABASE_SERVICE_ROLE_KEY(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export type Lead = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  source: string;
  status: "active" | "paused" | "unsubscribed" | "bounced";
  signed_up_at: string;
  unsubscribed_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type EmailLogRow = {
  id: string;
  lead_id: string;
  template_slug: string;
  day_offset: number;
  subject: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  gas_message_id: string | null;
  sent_at: string;
};
