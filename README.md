# mail-sequence

Self-hosted email drip sequence for Liav's lead funnel. Sits alongside `liav-lead-magnet` (the landing page) and `liav-lead-magnet` posts new leads here; mail-sequence stores them in Supabase and sends a sequence of Hebrew emails via a Google Apps Script Gmail web app, on a daily Vercel cron.

```
liav-lead-magnet  ─POST x-ingest-secret──▶  /api/leads/ingest  ──▶  Supabase (leads)
                                                                       │
                                            Vercel cron 07:00 UTC ─▶ /api/cron/sequence
                                                                       │
                                                                       ▼
                                                                  GAS web app ─▶ Gmail
```

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase Postgres** (server-side only, via service-role key)
- **Google Apps Script** web app for Gmail send (~90 emails/day on a personal Gmail account, ~1500 on Workspace)
- **Vercel cron** for the daily run

No external email service (no SendGrid/Resend/etc.) — Gmail through GAS is free and good enough for the volume.

## Setup

### 1. Supabase

1. Create a project, region eu-central-1 recommended.
2. SQL Editor → paste `supabase/migrations/0001_init.sql` → Run.
3. Project Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 2. Google Apps Script (email sender)

1. https://script.google.com → New project → paste `gas/email-sender.gs`.
2. Project Settings (gear) → Script properties → add `SECRET = <a long random string>`.
3. Deploy → New deployment → Web app:
   - Execute as: **Me**
   - Who has access: **Anyone with the link**
4. Copy the `/exec` URL → `GAS_EMAIL_WEBHOOK`. The secret you set → `GAS_EMAIL_SECRET`.

### 3. Environment

Copy `.env.local.example` to `.env.local` and fill in. Required:

| Var | What |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
| `GAS_EMAIL_WEBHOOK`, `GAS_EMAIL_SECRET` | from step 2 |
| `FROM_NAME` | Display name on outgoing mail |
| `GMAIL_DAILY_QUOTA` | Hard cap per cron run. 90 for personal Gmail, 1400 for Workspace. |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `ADMIN_COOKIE_SECRET` | HMAC key for the admin session cookie. `openssl rand -hex 32` |
| `CRON_SECRET` | Vercel cron auth. `openssl rand -hex 32` |
| `INGEST_SECRET` | Shared secret for `/api/leads/ingest`. `openssl rand -hex 32` |
| `PUBLIC_URL` | Site origin used in unsubscribe links (no trailing slash) |

### 4. Vercel

1. Import the repo on Vercel.
2. Add every variable from `.env.local` as a Project env var.
3. Deploy. The cron in `vercel.json` runs `/api/cron/sequence` at 07:00 UTC daily.

### 5. Wire up liav-lead-magnet

In `liav-lead-magnet/app/api/submit/route.ts`, after the existing Sheets POST, add a fire-and-forget call:

```ts
await fetch(`${process.env.MAIL_SEQUENCE_URL}/api/leads/ingest`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-ingest-secret": process.env.MAIL_SEQUENCE_INGEST_SECRET!,
  },
  body: JSON.stringify({ email, name, phone, source: "liav-lead-magnet" }),
}).catch(() => {}); // never block lead capture on this
```

Set `MAIL_SEQUENCE_URL` (e.g. `https://mail-sequence.vercel.app`) and `MAIL_SEQUENCE_INGEST_SECRET` (same value as `INGEST_SECRET` here) in the lead-magnet's Vercel env vars.

## Files

```
app/
  page.tsx                    Public signup form
  admin/                      Password-gated lead dashboard
  api/signup/                 Public signup endpoint
  api/leads/ingest/           Server-to-server ingest (x-ingest-secret)
  api/cron/sequence/          Daily cron entrypoint (Bearer CRON_SECRET)
  api/admin/...               Login / logout / list-leads / patch-status
  u/[token]/                  One-click unsubscribe
lib/
  env.ts                      Required-env-var accessors
  supabase.ts                 Server-side Supabase client (service role)
  templates.ts                The email sequence (edit this to change copy)
  sequence.ts                 The cron-driven sender
  email.ts                    GAS web-app HTTP client
  admin-auth.ts               HMAC cookie session
  unsubscribe.ts              Signed unsub token + URL
supabase/migrations/0001_init.sql
gas/email-sender.gs
vercel.json                   Cron config
```

## Editing the sequence

Edit `lib/templates.ts`. Each step is `{ slug, day_offset, subject, body }`. `slug` is the unique key — never reuse a slug for a different email, or already-sent leads will skip the new content.

To add a step: append to the array. To change the wording of an unsent step: edit in place. To change wording for a step some leads have already received: add a new step with a fresh slug and remove the old one (or leave the old one — already-sent leads won't get it again).

## Manual cron trigger

```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://mail-sequence.vercel.app/api/cron/sequence
```

Returns `{ ok, sent, failed, skipped, quotaRemaining }`.

## Quota notes

- Personal Gmail (`@gmail.com`): ~100 emails/day soft cap. We default `GMAIL_DAILY_QUOTA=90` to leave headroom.
- Google Workspace: 1500/day.
- GAS itself has a 6-min execution limit per request — we send one email per HTTP round-trip from the Next app, so this isn't a concern.

## Why GAS instead of SendGrid/Resend

Free, no account setup beyond what we already have, no domain-verification step, mails come from your real Gmail (high deliverability for a small list), and we already use GAS for other webhooks in this stack. The tradeoff is the soft daily cap; if the list grows past ~1000 active leads cycling through the sequence, swap `lib/email.ts` for a proper ESP.
