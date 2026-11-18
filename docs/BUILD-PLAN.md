# Everyday Black Friday — Build Plan (roadmap)
Created 2026-11-18.

## The product in one line
One site that watches every deal for you — browse 8 categories, get a daily
newsletter and keyword deal-alerts (1 free, unlimited for $8/mo), and it
updates itself.

## The big idea: be THE place people check (the draw)
A deals site needs a reason to visit. Ours: every big Black Friday deal in one
place, all year.
- Most "big deals" already come from the paid feeds as on-sale items — so they
  draw people AND pay us.
- Famous doorbusters we don't earn on: still list them to be the destination,
  but sourced legitimately — hand-picked from retailers' own Black Friday ads /
  press, NOT scraped from retailer pages or copied from another deal site. Show
  a clear note when a link isn't an affiliate link.
- We make money from: the $8 membership, the newsletter audience, and the
  commissionable deals people also click. Unpaid hero deals are the bait.
- No magic "auto-grab every deal for free" exists. Honest engine = feeds
  (automatic) + hand-picked heroes + alerts that bring people back.

## 🟢 NOW (no accounts needed — Claude can do immediately)
- [ ] This plan, saved in the repo.
- [ ] Add a "Biggest Black Friday Deals" section to the homepage.
- [ ] Upgrade the deal data format: retailer, price, was-price, discount %,
      category, affiliate yes/no, expiry, last-checked, source. Site updates
      when the data file changes.
- [ ] Draft the Affiliate.com + FlexOffers applications (ready to paste).
- [ ] Define the CSV format so deals can be added by hand from day one.

## 🟡 TOMORROW (needs Moishy — Claude preps, Moishy submits/decides)
- [ ] Submit FlexOffers + Affiliate.com applications (~1–2 day approval).
- [ ] Create the Supabase project (Moishy's account) — the backend.
- [ ] Open a Stripe account for the $8/mo plan.
- [ ] Get the Sender.net API token + group ID for emails.
- [ ] Start a NEW Google Cloud project for sign-in (never reuse another app's).
- [ ] Pick the first specialist merchants to apply to (high-rate per category).

## 🔵 STILL TO BUILD (the engine)
- [ ] Supabase backend: accounts, deals DB, watchers, price snapshots.
- [ ] Admin deal uploader (CSV + manual) = source of truth.
- [ ] Auto-import job: pull on-sale items from Affiliate.com / FlexOffers,
      dedupe, map to the 8 categories, flag Black Friday, review → publish.
- [ ] Keyword watcher matching + email via Sender (1 free / unlimited $8).
- [ ] Stripe $8/mo checkout + enforce the limit server-side.
- [ ] Google sign-in (new Cloud project).
- [ ] Price history from saved snapshots (+ ShopSavvy later for deeper history).
- [ ] FTC affiliate disclosure on every deal card; "View Deal" → retailer.
- [ ] Per-page walk-in rooms (Stage 2 design rollout) — the look.

## Order that makes sense
1. Tonight: Black Friday section + deal format + application drafts (no waiting).
2. Tomorrow: submit applications, stand up Supabase, open Stripe/Sender/Google.
3. Then build the engine while approvals come in; launch with manual deals;
   switch feeds on as they're approved.

## Tech stack (decided)
- Front end: the current static site (GitHub Pages) for the look — stays.
- Backend/engine: Supabase (auth, database, storage, scheduled cron).
- Deal data + links: Affiliate.com (keep 100% commission, own IDs).
- Shelf-filler network: FlexOffers (single join, 6,000+ stores).
- Price history: ShopSavvy (later).
- Payments: Stripe ($8/mo). Email: Sender.net. Sign-in: Google (new project).
