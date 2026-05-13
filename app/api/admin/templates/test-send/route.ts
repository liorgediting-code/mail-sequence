// "Send a test of this template to an email address."
// POST { id, to } → sends the template once via GAS, ignoring sequence rules.
// Does NOT write to email_log (it's a test, not a real send).

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { supa } from "@/lib/supabase";
import { renderHtml, renderText } from "@/lib/templates";
import { sendViaGas } from "@/lib/email";
import { unsubUrl } from "@/lib/unsubscribe";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { id?: string; to?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const to = (body.to || "").trim().toLowerCase();
  if (!body.id || !EMAIL_RE.test(to)) return NextResponse.json({ error: "id_and_to_required" }, { status: 400 });

  const { data: t, error } = await supa()
    .from("email_templates").select("subject, body").eq("id", body.id).single();
  if (error || !t) return NextResponse.json({ error: error?.message || "not_found" }, { status: 404 });

  // For preview, use a no-op unsub URL — clicking it will say "not found"
  // (which is correct, this isn't a real lead).
  const u = unsubUrl("00000000-0000-0000-0000-000000000000", to);
  const res = await sendViaGas({
    to,
    subject: `[TEST] ${t.subject}`,
    htmlBody: renderHtml(t.body, u),
    textBody: renderText(t.body, u),
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, messageId: res.messageId, quotaRemaining: res.quotaRemaining });
}
