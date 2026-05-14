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

// Manual POST trigger (e.g. from admin or a curl during testing).
// To prevent accidental sends from testing, the manual path is dry-run by
// default — it returns what WOULD have been sent. Pass ?confirm=YES_SEND_NOW
// in the URL to actually deliver.
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${env.CRON_SECRET()}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const confirm = new URL(req.url).searchParams.get("confirm");
  if (confirm !== "YES_SEND_NOW") {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      message: "Manual cron trigger is dry-run by default. Pass ?confirm=YES_SEND_NOW to actually send.",
    });
  }
  try {
    const stat = await runSequence();
    return NextResponse.json({ ok: true, ...stat });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
