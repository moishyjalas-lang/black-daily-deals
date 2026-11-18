# Everyday Black Friday — backend (Supabase) guide

This folder is the **source of truth** for the database. If the database and
this folder ever disagree, re-run the files here. You can never be locked out:
the SQL editor (postgres superuser) and the secret key both bypass all security
rules, so management always works.

## The project
- **Service / engine:** Supabase (database + auth + storage + functions + cron)
- **Org:** Black Daily Deals   ·   **Project:** Everyday Black Friday
- **Project ref:** `ncdmhmgkurfphdrjvhin`
- **URL:** https://ncdmhmgkurfphdrjvhin.supabase.co
- **Plan:** Free ($0, no card). Dashboard: supabase.com/dashboard → project.

## Files
- `schema.sql` — all tables, the admin-check function, the auto-profile trigger,
  and every security (RLS) policy. **Re-runnable** (safe to run again).
- `seed.sql` — the starting deals. Re-runnable; won't overwrite later edits
  (uses `on conflict (ext_id) do nothing`).

To apply: Dashboard → **SQL Editor** → paste the file → **Run**. (A "destructive
operation" warning is normal — it's the `drop ... if exists` lines that make the
file re-runnable; on an existing DB they just refresh the policies.)

## The keys (where they live, what's safe)
- **Publishable key** — PUBLIC, safe in the browser. Lives in
  `../js/supabase-config.js`. Protected by Row Level Security.
- **Secret / service-role key** — NEVER in this repo or the front end. Only in
  the dashboard and server-side functions. This is the anti-hack rule.

## Make yourself the admin (one time, after first sign-in)
The admin owns the Control Center (add/edit deals, pop-ups, see members, etc.).
Admin = a profile row with `is_admin = true`. After Moishy signs in on the site
once (which auto-creates his profile), run this once in the SQL Editor:

```sql
update public.profiles set is_admin = true
where email = 'moishyjalas@gmail.com';
```

That's it — from then on the admin screen (logged in as Moishy) can manage
everything, no secret key in the browser.

## Security model (plain version)
- **deals, price history** — everyone can READ; only the admin can WRITE.
- **watchers (keyword alerts)** — each person only sees/edits their own.
- **newsletter subscribers** — anyone can sign up; only the admin can read the
  list (protects people's emails).
- **profiles** — you see your own; the admin sees all.

## Safe-update workflow (update the live app WITHOUT breaking it)
1. **Data changes** (deals, pop-ups) → done in the Control Center. Zero code,
   zero deploy, zero risk.
2. **Code changes** → never pushed straight to the live site. Work on a branch,
   let Cloudflare build a **preview URL**, check it there, and only then merge to
   `main`. Cloudflare keeps old versions, so one-click **rollback** is always
   available if something slips through.
3. **Database changes** → edit `schema.sql`, keep it re-runnable, run in the SQL
   Editor. Never drop a table with live data without a backup.

## The Admin Control Center (what it runs — to build)
One private screen (admin only) to run the whole business:
- Deals: add / edit / delete, set price, mark Biggest-Black-Friday / featured /
  deal-of-day, expiry.
- Pop-ups / promos: message, button, audience, start-end, close button, frequency.
- Subscribers & Pro ($8) members: counts, list, export.
- Watchers: what keywords people want (demand signal).
- Dashboard numbers: visitors (Cloudflare Web Analytics, free), signups, members.
- Deep infrastructure (Cloudflare / Supabase / Stripe / domain): shown as status
  + one-click links — NOT rebuilt inside the app (that would require master keys
  in the app = the lock-out / hack risk we avoid).
