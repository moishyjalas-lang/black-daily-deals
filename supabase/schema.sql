-- Everyday Black Friday — Database schema (source of truth)
-- Project: Everyday Black Friday (Supabase), org "Black Daily Deals"
-- Re-runnable: safe to run again; uses IF NOT EXISTS / OR REPLACE / drop-create policies.
--
-- MAINTENANCE / ANTI-LOCKOUT NOTES
--  * This file is the master copy of the database design. Edit here, then re-run
--    in the Supabase SQL editor (Dashboard -> SQL Editor). Keep it in git.
--  * The SQL editor runs as the postgres superuser and the service-role key
--    bypasses Row Level Security, so we can ALWAYS manage data even if a policy
--    is wrong. You are never locked out.
--  * Admin = a profile row with is_admin = true. After Moishy signs in on the
--    site for the first time, run (once):
--        update public.profiles set is_admin = true
--        where email = 'moishyjalas@gmail.com';
--    After that, the admin screen (logged in as Moishy) can manage everything
--    without any secret key in the browser.

-- ============================================================
-- 1. PROFILES  (one row per signed-in user; extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text,
  is_admin          boolean not null default false,
  is_pro            boolean not null default false,   -- $8/mo "Everyday Plus" membership
  stripe_customer_id text,
  created_at        timestamptz not null default now()
);

-- Admin check helper. SECURITY DEFINER so policies can read is_admin without
-- recursively triggering the profiles RLS policy.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Auto-create a profile whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. DEALS  (what the site shows; matches data/deals.json + extras)
-- ============================================================
create table if not exists public.deals (
  id             bigint generated always as identity primary key,
  ext_id         text unique,             -- stable external key for upserts (feeds/seed)
  title          text not null,
  category       text,
  subcategory    text,
  image          text,
  price          numeric(10,2),
  original_price numeric(10,2),
  discount       integer,                 -- percent off
  store          text,                    -- retailer name
  affiliate_url  text,
  is_affiliate   boolean not null default true,  -- false = non-commissionable hero deal
  price_checked  timestamptz,
  featured       boolean not null default false,
  deal_of_day    boolean not null default false,
  is_black_friday boolean not null default false, -- shows in "Biggest Black Friday Deals"
  expiry         timestamptz,
  source         text,                    -- feed name or 'manual'
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists deals_category_idx on public.deals (category);
create index if not exists deals_discount_idx on public.deals (discount desc);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists deals_touch_updated_at on public.deals;
create trigger deals_touch_updated_at
  before update on public.deals
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 3. WATCHERS  (keyword deal-alerts; 1 free / unlimited for Pro)
-- ============================================================
create table if not exists public.watchers (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  keyword    text not null,
  category   text,            -- optional filter
  max_price  numeric(10,2),   -- optional "only alert under $X"
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists watchers_user_idx on public.watchers (user_id);

-- ============================================================
-- 4. PRICE_SNAPSHOTS  (price history per deal)
-- ============================================================
create table if not exists public.price_snapshots (
  id          bigint generated always as identity primary key,
  deal_id     bigint references public.deals(id) on delete cascade,
  price       numeric(10,2),
  captured_at timestamptz not null default now()
);
create index if not exists price_snapshots_deal_idx on public.price_snapshots (deal_id);

-- ============================================================
-- 5. NEWSLETTER_SUBSCRIBERS  (the daily email list)
-- ============================================================
create table if not exists public.newsletter_subscribers (
  id            bigint generated always as identity primary key,
  email         text unique not null,
  subscribed_at timestamptz not null default now(),
  source        text
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Everyone can READ deals + price history. Only the admin can WRITE them.
-- Each user owns their watchers. Anyone can subscribe; only admin reads emails.
-- ============================================================
alter table public.profiles              enable row level security;
alter table public.deals                 enable row level security;
alter table public.watchers              enable row level security;
alter table public.price_snapshots       enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---- profiles ----
drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles admin writes" on public.profiles;
create policy "profiles admin writes" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- deals ---- (public read, admin write)
drop policy if exists "deals public read" on public.deals;
create policy "deals public read" on public.deals
  for select using (true);

drop policy if exists "deals admin write" on public.deals;
create policy "deals admin write" on public.deals
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- watchers ---- (each user owns theirs; admin can see all)
drop policy if exists "watchers owner or admin" on public.watchers;
create policy "watchers owner or admin" on public.watchers
  for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---- price_snapshots ---- (public read, admin write)
drop policy if exists "snapshots public read" on public.price_snapshots;
create policy "snapshots public read" on public.price_snapshots
  for select using (true);

drop policy if exists "snapshots admin write" on public.price_snapshots;
create policy "snapshots admin write" on public.price_snapshots
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- newsletter_subscribers ---- (anyone can sign up; only admin reads)
drop policy if exists "newsletter anyone subscribe" on public.newsletter_subscribers;
create policy "newsletter anyone subscribe" on public.newsletter_subscribers
  for insert with check (true);

drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers
  for select using (public.is_admin());

drop policy if exists "newsletter admin manage" on public.newsletter_subscribers;
create policy "newsletter admin manage" on public.newsletter_subscribers
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- OWNER HQ — additional tables for the admin control center
-- Appended 2026-11-18. Idempotent & re-runnable. Admin-gated.
-- Run in Supabase SQL Editor AFTER the base schema above.
-- Until these exist, the matching HQ screens degrade to a
-- "not set up yet" state instead of breaking.
-- ============================================================

-- add a role + consent columns used by Team and Audience screens
alter table public.profiles              add column if not exists role text not null default 'member';
alter table public.newsletter_subscribers add column if not exists status text not null default 'subscribed'; -- subscribed | unsubscribed
alter table public.newsletter_subscribers add column if not exists consent_source text;
alter table public.newsletter_subscribers add column if not exists unsubscribed_at timestamptz;

-- ---- category tree (Screen 5) ----
create table if not exists public.category_nodes (
  id          bigint generated always as identity primary key,
  parent_id   bigint references public.category_nodes(id) on delete cascade,
  slug        text,
  name        text not null,
  image       text,
  aliases     text[] default '{}',
  supplier_map jsonb default '{}'::jsonb,
  sort        integer not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists category_nodes_parent_idx on public.category_nodes (parent_id);

-- ---- imports (Screen 4) ----
create table if not exists public.import_batches (
  id          bigint generated always as identity primary key,
  filename    text,
  source      text,
  total_rows  integer not null default 0,
  approved    integer not null default 0,
  rejected    integer not null default 0,
  status      text not null default 'review',  -- review | approved | rejected
  created_at  timestamptz not null default now()
);
create table if not exists public.import_rows (
  id          bigint generated always as identity primary key,
  batch_id    bigint references public.import_batches(id) on delete cascade,
  raw         jsonb,
  issues      text[] default '{}',
  state       text not null default 'review',  -- review | approved | rejected | published
  deal_id     bigint references public.deals(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---- site settings + revisions (Screen 6) ----
create table if not exists public.site_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);
create table if not exists public.site_revisions (
  id          bigint generated always as identity primary key,
  snapshot    jsonb not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---- promotions: announcements & pop-ups (Screen 7) ----
create table if not exists public.promotions (
  id            bigint generated always as identity primary key,
  kind          text not null default 'announcement',  -- announcement | popup
  headline      text,
  body          text,
  button_label  text,
  button_url    text,
  audience      text not null default 'everyone',       -- everyone | members | non-members
  start_at      timestamptz,
  end_at        timestamptz,
  frequency_cap integer,                                 -- max shows per visitor
  dismiss_hours integer default 24,
  status        text not null default 'draft',           -- draft | scheduled | active | paused | expired
  created_at    timestamptz not null default now()
);

-- ---- email campaigns (Screen 8) ----
create table if not exists public.email_campaigns (
  id           bigint generated always as identity primary key,
  subject      text,
  preview_text text,
  deal_ids     bigint[] default '{}',
  sender_name  text,
  sender_email text,
  mailing_addr text,
  status       text not null default 'draft',   -- draft | scheduled | sending | sent | paused
  scheduled_at timestamptz,
  sent_count   integer,  -- null until a real send happens
  created_at   timestamptz not null default now()
);

-- ---- support cases + public deal reports (Screen 11) ----
create table if not exists public.support_cases (
  id          bigint generated always as identity primary key,
  kind        text not null default 'message',  -- message | account | deal_report
  subject     text,
  body        text,
  from_email  text,
  deal_id     bigint references public.deals(id) on delete set null,
  status      text not null default 'open',     -- open | pending | resolved | escalated
  priority    text not null default 'normal',
  assignee    uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- team invites (Screen 12) ----
create table if not exists public.team_invites (
  id          bigint generated always as identity primary key,
  email       text not null,
  role        text not null default 'analyst',
  status      text not null default 'invited',  -- invited | accepted | revoked
  created_at  timestamptz not null default now()
);

-- ---- audit events (Screens 12/13/15) ----
create table if not exists public.audit_events (
  id          bigint generated always as identity primary key,
  actor       uuid references auth.users(id),
  actor_email text,
  action      text not null,
  target      text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_events_created_idx on public.audit_events (created_at desc);

-- ---- emergency flags (Screen 16) ----
create table if not exists public.emergency_flags (
  key         text primary key,   -- pause_publishing | pause_emails | pause_alerts | pause_popups | pause_signups | pause_links | maintenance_mode
  paused      boolean not null default false,
  reason      text,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now()
);

-- ---- search log for demand (Screen 9) ----
create table if not exists public.search_log (
  id          bigint generated always as identity primary key,
  term        text not null,
  matched     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists search_log_created_idx on public.search_log (created_at desc);

-- ---- integration status cards (Screen 14) — status/notes ONLY, never secrets ----
create table if not exists public.integrations (
  key         text primary key,  -- supabase | cloudflare | google_auth | stripe | sender | amazon
  label       text,
  status      text not null default 'not_connected', -- connected | not_connected | error
  last_sync   timestamptz,
  note        text,
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- RLS for the new HQ tables
-- ============================================================
alter table public.category_nodes  enable row level security;
alter table public.import_batches  enable row level security;
alter table public.import_rows     enable row level security;
alter table public.site_settings   enable row level security;
alter table public.site_revisions  enable row level security;
alter table public.promotions      enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.support_cases   enable row level security;
alter table public.team_invites    enable row level security;
alter table public.audit_events    enable row level security;
alter table public.emergency_flags enable row level security;
alter table public.search_log      enable row level security;
alter table public.integrations    enable row level security;

-- admin-only tables (read + write by admin). Public-facing surfaces noted.
do $$
declare t text;
begin
  foreach t in array array['category_nodes','import_batches','import_rows','site_revisions',
    'email_campaigns','team_invites','audit_events','integrations'] loop
    execute format('drop policy if exists "%s admin all" on public.%I', t, t);
    execute format('create policy "%s admin all" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- category_nodes + site_settings + promotions + emergency_flags are PUBLIC-READ
-- (the live site reads them) but ADMIN-WRITE.
do $$
declare t text;
begin
  foreach t in array array['category_nodes','site_settings','promotions','emergency_flags'] loop
    execute format('drop policy if exists "%s public read" on public.%I', t, t);
    execute format('create policy "%s public read" on public.%I for select using (true)', t, t);
    execute format('drop policy if exists "%s admin write" on public.%I', t, t);
    execute format('create policy "%s admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- support_cases: anyone may submit (insert); admin reads/updates.
drop policy if exists "support public submit" on public.support_cases;
create policy "support public submit" on public.support_cases for insert with check (true);
drop policy if exists "support admin read" on public.support_cases;
create policy "support admin read" on public.support_cases for select using (public.is_admin());
drop policy if exists "support admin manage" on public.support_cases;
create policy "support admin manage" on public.support_cases for update using (public.is_admin()) with check (public.is_admin());

-- search_log: anyone may insert (the site logs searches); admin reads.
drop policy if exists "search public insert" on public.search_log;
create policy "search public insert" on public.search_log for insert with check (true);
drop policy if exists "search admin read" on public.search_log;
create policy "search admin read" on public.search_log for select using (public.is_admin());
