// Admin: list leads (with last-sent metadata) and update lead status.

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: leads, error } = await supa()
    .from("leads")
    .select("*")
    .order("signed_up_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (leads ?? []).map((l) => l.id);
  let logs: { lead_id: string; template_slug: string; status: string; sent_at: string }[] = [];
  if (ids.length) {
    const { data, error: e2 } = await supa()
      .from("email_log")
      .select("lead_id, template_slug, status, sent_at")
      .in("lead_id", ids)
      .order("sent_at", { ascending: false });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
    logs = data ?? [];
  }

  const byLead = new Map<string, typeof logs>();
  for (const row of logs) {
    const arr = byLead.get(row.lead_id) ?? [];
    arr.push(row);
    byLead.set(row.lead_id, arr);
  }

  return NextResponse.json({
    leads: (leads ?? []).map((l) => ({
      ...l,
      logs: byLead.get(l.id) ?? [],
    })),
  });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { id?: string; status?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.id || !body.status) return NextResponse.json({ error: "missing" }, { status: 400 });
  const allowed = ["active", "paused", "unsubscribed", "bounced"];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: "bad_status" }, { status: 400 });
  }
  const patch: Record<string, unknown> = { status: body.status };
  if (body.status === "unsubscribed") patch.unsubscribed_at = new Date().toISOString();
  const { error } = await supa().from("leads").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
