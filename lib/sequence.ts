// Sequence engine. Run once per day via /api/cron/sequence.
//
// For each active lead, find the earliest unsent SEQUENCE step whose
// `signed_up_at + day_offset days` is <= now. Send it via GAS. Log every
// attempt (sent/failed) to email_log. Stop early if we hit the daily quota
// budget.

import { supa, type Lead } from "./supabase";
import { SEQUENCE, renderHtml, renderText } from "./templates";
import { sendViaGas } from "./email";
import { unsubUrl } from "./unsubscribe";
import { env } from "./env";

type Stat = { sent: number; failed: number; skipped: number; quotaRemaining: number | null };

export async function runSequence(opts: { dryRun?: boolean; now?: Date } = {}): Promise<Stat> {
  const now = opts.now ?? new Date();
  const budget = env.GMAIL_DAILY_QUOTA();
  const stat: Stat = { sent: 0, failed: 0, skipped: 0, quotaRemaining: null };

  const { data: leads, error } = await supa()
    .from("leads")
    .select("*")
    .eq("status", "active")
    .order("signed_up_at", { ascending: true });

  if (error) throw new Error(`leads_query: ${error.message}`);
  if (!leads || leads.length === 0) return stat;

  // Pull all sent slugs in one query for efficiency.
  const leadIds = leads.map((l) => l.id);
  // Only `sent` is terminal. `failed` rows are retryable on the next run; the
  // upsert below uses (lead_id, template_slug) as the conflict key so a retry
  // overwrites the prior failure record rather than throwing a unique violation.
  const { data: logs, error: logsErr } = await supa()
    .from("email_log")
    .select("lead_id, template_slug")
    .eq("status", "sent")
    .in("lead_id", leadIds);
  if (logsErr) throw new Error(`logs_query: ${logsErr.message}`);

  const sentMap = new Map<string, Set<string>>();
  for (const row of logs ?? []) {
    let s = sentMap.get(row.lead_id);
    if (!s) { s = new Set(); sentMap.set(row.lead_id, s); }
    s.add(row.template_slug);
  }

  for (const lead of leads as Lead[]) {
    if (stat.sent >= budget) break;
    const alreadySent = sentMap.get(lead.id) ?? new Set<string>();

    const due = SEQUENCE
      .filter((t) => !alreadySent.has(t.slug))
      .filter((t) => isDue(lead.signed_up_at, t.day_offset, now))
      .sort((a, b) => a.day_offset - b.day_offset)[0];

    if (!due) continue;

    if (opts.dryRun) {
      stat.skipped++;
      continue;
    }

    const u = unsubUrl(lead.id, lead.email);
    const html = renderHtml(due.body, u);
    const text = renderText(due.body, u);

    const res = await sendViaGas({
      to: lead.email,
      subject: due.subject,
      htmlBody: html,
      textBody: text,
    });

    const base = {
      lead_id: lead.id,
      template_slug: due.slug,
      day_offset: due.day_offset,
      subject: due.subject,
    };

    if (res.ok) {
      stat.sent++;
      stat.quotaRemaining = res.quotaRemaining;
      await supa().from("email_log").upsert(
        { ...base, status: "sent", gas_message_id: res.messageId, error: null, sent_at: new Date().toISOString() },
        { onConflict: "lead_id,template_slug" },
      );
    } else {
      stat.failed++;
      if (res.quotaRemaining !== undefined) stat.quotaRemaining = res.quotaRemaining;
      await supa().from("email_log").upsert(
        { ...base, status: "failed", error: res.error, sent_at: new Date().toISOString() },
        { onConflict: "lead_id,template_slug" },
      );
      // If GAS reports quota exhausted, stop the whole run.
      if (res.error === "quota_exhausted") break;
    }
  }

  return stat;
}

function isDue(signedUpAt: string, dayOffset: number, now: Date): boolean {
  const t = new Date(signedUpAt).getTime() + dayOffset * 86_400_000;
  return t <= now.getTime();
}
