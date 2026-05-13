-- Move the email sequence from hardcoded lib/templates.ts to DB-backed table
-- so it can be edited from the admin UI.
--
-- Notes:
--  * `slug` is the stable identity used by email_log to mark "already sent".
--    The UI auto-generates slugs on create and never edits them, so renaming
--    or rewriting an email won't cause it to resend to existing leads.
--  * No FK from email_log → email_templates: deleting a template must not
--    cascade-purge audit history.

create table if not exists email_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  day_offset  int  not null check (day_offset >= 0),
  subject     text not null,
  body        text not null,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists email_templates_day_idx     on email_templates (day_offset);
create index if not exists email_templates_enabled_idx on email_templates (enabled);

-- Seed with the two templates currently shipped in lib/templates.ts.
-- Idempotent via slug uniqueness — re-running this migration is safe.
insert into email_templates (slug, day_offset, subject, body) values
  ('welcome', 0, 'המדריך שלך',
   'היי! ראיתי שנרשמת לקבל את המדריך שלי, מקווה שראית אותו ואם לא אני מצרף לך כאן קישור אליו: https://liavcohen.co.il

(נ.ב, הוספתי אותך לרשימת המיילים שלי, כאן אני מביא הרבה מאוד ערך בחינם לגמרי ;) ממליץ לך להישאר, אבל אם תרצה לצאת תמיד תוכל ללחוץ למטה על "הסר".'
  ),
  ('fear-of-people', 1, 'הדבר היחיד שעוצר את המכירה שלך',
   'היי, טוב — זה המייל הראשון יחסית שאני שולח לך עם באמת ערך, ורציתי לספר לך על הבעיה האמיתית במכירות של בעלי עסקים שדופקת להם את כל אחוזי ההמרה.

והיא: פחד מאנשים. רוב בעלי העסקים שמגיעים אליי פוחדים מאנשים — פוחדים לשאול שאלה, פוחדים להעמיד את הלקוח במקום, ונותנים לו לדרוך עליהם במילים אחרות. וכשהלקוח נותן התנגדות כזו או אחרת, הם ישר מתקפלים ומשחררים אותו בלי לשאול שאלות מכווינות.

אם קראת את המדריך שקיבלת במייל הקודם, כנראה שאתה כבר קצת יותר מבין במכירות משאר בעלי העסקים. מה שאני רוצה להגיד לך זה — אף פעם אל תפחד לשאול שאלות, להעמיד את הלקוח במקום אם הוא מדבר לא לעניין, ואף פעם אל תשחרר אם הוא נותן התנגדות. תמיד תנסה לפתור אותה או להבין אם זה אמיתי או שהוא מחרטט.

אוהב,
ליאב.'
  )
on conflict (slug) do nothing;

-- updated_at trigger
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists email_templates_touch on email_templates;
create trigger email_templates_touch
  before update on email_templates
  for each row execute function touch_updated_at();
