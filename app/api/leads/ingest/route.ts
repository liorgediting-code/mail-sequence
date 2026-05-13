// Server-to-server lead ingest. Called by liav-lead-magnet's /api/submit.
// Auth: header `x-ingest-secret: <INGEST_SECRET>`.

import { NextResponse } from "next/server";
import { supa } from "@/lib/supabase";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const secret = req.headers.get("x-ingest-secret");
  if (!secret || secret !== env.INGEST_SECRET()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    email?: string; name?: string | null; phone?: string | null;
    source?: string; meta?: Record<string, unknown>;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const { data, error } = await supa()
    .from("leads")
    .upsert(
      {
        email,
        name:   body.name   ?? null,
        phone:  body.phone  ?? null,
        source: body.source || "liav-lead-magnet",
        meta:   body.meta   ?? {},
        status: "active",
      },
      { onConflict: "email", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, lead_id: data?.id });
}
