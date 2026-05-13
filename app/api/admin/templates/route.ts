// Admin CRUD for the email sequence (table email_templates).
//
// Endpoints:
//   GET    /api/admin/templates           list
//   POST   /api/admin/templates           create  { subject, body, day_offset?, enabled? }
//   PATCH  /api/admin/templates           update  { id, subject?, body?, day_offset?, enabled? }
//   DELETE /api/admin/templates?id=...    hard-delete (email_log rows survive)
//
// All gated by isAdminAuthed(). Slug is auto-generated on create and never
// editable — it's the stable identity used by email_log so already-sent
// emails to existing leads stay tracked even when copy is rewritten.

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { supa } from "@/lib/supabase";
import { suggestSlug } from "@/lib/templates";

export const runtime = "nodejs";

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supa()
      .from("email_templates").select("slug").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
  }
  throw new Error("could_not_generate_unique_slug");
}

export async function GET() {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supa()
    .from("email_templates")
    .select("*")
    .order("day_offset", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    // Surface a friendly hint if the migration hasn't been applied.
    if ((error.code || "").includes("PGRST205") || error.message.includes("does not exist")) {
      return NextResponse.json({ error: "migration_needed", hint: "Run supabase/migrations/0002_templates.sql in the SQL editor." }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { subject?: string; body?: string; day_offset?: number; enabled?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const subject = (body.subject || "").trim();
  const text = (body.body || "").trim();
  if (!subject || !text) return NextResponse.json({ error: "subject_and_body_required" }, { status: 400 });
  const day_offset = Number.isFinite(body.day_offset) ? Math.max(0, Math.floor(body.day_offset as number)) : 0;

  const slug = await uniqueSlug(suggestSlug(subject));
  const { data, error } = await supa()
    .from("email_templates")
    .insert({
      slug, subject, body: text, day_offset,
      enabled: body.enabled !== false,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function PATCH(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { id?: string; subject?: string; body?: string; day_offset?: number; enabled?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (typeof body.subject === "string")  patch.subject = body.subject.trim();
  if (typeof body.body === "string")     patch.body = body.body;
  if (Number.isFinite(body.day_offset))  patch.day_offset = Math.max(0, Math.floor(body.day_offset as number));
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (Object.keys(patch).length === 0)   return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });

  const { data, error } = await supa()
    .from("email_templates")
    .update(patch).eq("id", body.id)
    .select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(req: Request) {
  if (!isAdminAuthed()) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const { error } = await supa().from("email_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
