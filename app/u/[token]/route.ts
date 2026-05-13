// One-click unsubscribe via signed token from the email footer.
// URL: /u/<leadId>.<hmacToken>

import { NextResponse } from "next/server";
import { supa } from "@/lib/supabase";
import { unsubTokenMatches } from "@/lib/unsubscribe";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: { token: string } }) {
  const [leadId, token] = (ctx.params.token || "").split(".");
  if (!leadId || !token) return html("קישור לא תקין", 400);

  const { data: lead, error } = await supa()
    .from("leads").select("id, email, status").eq("id", leadId).single();
  if (error || !lead) return html("לא נמצא נמען", 404);

  if (!unsubTokenMatches(lead.id, lead.email, token)) return html("קישור לא תקין", 400);

  if (lead.status !== "unsubscribed") {
    await supa().from("leads")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("id", lead.id);
  }

  return html("הוסרת מהרשימה. לא תקבל יותר מיילים. תודה.", 200);
}

function html(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"/><title>הסרה</title>
<style>body{font-family:Heebo,system-ui,sans-serif;background:#f6f6f6;color:#1a1f3a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;padding:32px 40px;border-radius:8px;border:1px solid #e5e5e5;text-align:center;max-width:480px}</style></head>
<body><div class="card"><p style="font-size:18px;margin:0">${message}</p></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
