// Public signup endpoint for mail-sequence's own landing page.
// (External landing pages should call /api/leads/ingest with the INGEST_SECRET.)

import { NextResponse } from "next/server";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: { email?: string; name?: string | null; phone?: string | null };
  try { body = await req.json(); } catch { return bad("bad_json"); }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return bad("invalid_email");

  const { error } = await supa()
    .from("leads")
    .upsert(
      {
        email,
        name:   body.name  ?? null,
        phone:  body.phone ?? null,
        source: "public_signup",
        status: "active",
      },
      { onConflict: "email", ignoreDuplicates: false },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
