-- mail-sequence schema
-- Run in Supabase SQL editor (or `supabase db push`) on a fresh project.

create extension if not exists "pgcrypto";

create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text,
  phone           text,
  source          text not null default 'landing',
  status          text not null default 'active'
                    check (status in ('active','paused','unsubscribed','bounced')),
  signed_up_at    timestamptz not null default now(),
  unsubscribed_at timestamptz,
  meta            jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists leads_status_idx       on leads (status);
create index if not exists leads_signed_up_at_idx on leads (signed_up_at);

create table if not exists email_log (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references leads(id) on delete cascade,
  template_slug   text not null,
  day_offset      int  not null,
  subject         text not null,
  status          text not null check (status in ('sent','failed','skipped')),
  error           text,
  gas_message_id  text,
  sent_at         timestamptz not null default now(),
  unique (lead_id, template_slug)
);

create index if not exists email_log_lead_idx   on email_log (lead_id);
create index if not exists email_log_sent_idx   on email_log (sent_at);

-- RLS: this app talks to Postgres ONLY via the service-role key from server-side
-- code, so we keep RLS off. Do NOT expose the anon key client-side anywhere.
alter table leads      disable row level security;
alter table email_log  disable row level security;
