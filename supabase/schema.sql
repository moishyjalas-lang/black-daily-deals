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
