// Daily cron: walk active leads and send any due email-sequence step.
// Triggered by Vercel cron (Authorization: Bearer $CRON_SECRET).

import { NextResponse } from "next/server";
import { runSequence } from "@/lib/sequence";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes; Vercel cron default is 60s

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${env.CRON_SECRET()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const stat = await runSequence();
    return NextResponse.json({ ok: true, ...stat });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

// Allow manual POST trigger from the admin UI with the same auth.
export const POST = GET;
