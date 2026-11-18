# Everyday Black Friday — Build Notes & Lessons

Written 2026-11-18. Purpose: record the mistakes made while building this
site, why they happened, what frustrated Moishy, and how each was fixed —
so they are not repeated. Read this before touching the design again.

## The core lesson
**Moishy is the designer. Build to his real images and his design system
EXACTLY. Do not improvise, draw, or interpret.** Every frustration below
traces back to building from my own guesses instead of his actual assets.

---

## Mistakes, impact, and fixes

### 1. Drew / faked visuals instead of using his real images
- **What I did:** First homepage used drawn placeholders and generic stock
  photos. It "looked AI-made and cheap… a 0-cent app instead of a
  $1,000,000 app."
- **Why:** I generated visuals instead of using the mockup/brand images he
  had already provided.
- **Fix:** Cropped the real product/category photos out of his own mockups
  (homepage tiles, big category photos) and used real retailer product
  images for deals. Used his `hero-ebf.png` brand image in the hero.
- **Rule:** Never draw, never use emoji/gradient-box placeholders. Use his
  real images, real product photos, or a media tool. If no real image
  exists, say so and leave the slot for him.

### 2. Bright yellow instead of champagne gold
- **What I did:** Used `#FFD700` / `#FFA500` (neon yellow/orange).
- **Impact:** "Your gold isn't gold… looks horrible / cheap."
- **Fix:** Switched to his champagne palette — `--gold #d5a047`,
  `--gold2 #f4d18b`, ivory `#fff7e9` on warm near-black `#0c0b0a`.
- **Rule:** Champagne gold only. The exact tokens live in the Design System
  artifact and `js`/page `:root`.

### 3. The design "vanished" below the hero
- **What I did:** Styled only the hero; the rest of the page went flat
  black. "It looks like two different websites stitched together."
- **Fix:** Ambient gold glow (fixed radial gradients) runs the full page;
  every card has a warm gradient + lit gold edge; serif headings
  throughout. No flat-black dead zones.
- **Rule:** The gold treatment carries top-to-bottom on every page.

### 4. Built from my interpretation, not his design system
- **What I did:** Guessed at layouts instead of using the design handoff +
  mockups he made (with Codex).
- **Fix:** Pulled his `design-book.html` + prototype CSS off his computer,
  built an "Everyday Black Friday Design System" artifact (tokens + brand
  book + reference images), and matched every page to his mockups
  (categories, search/filters, alerts).
- **Rule:** His mockups are the source of truth. Match them, don't reinvent.

### 5. Wrong fonts
- **What I did:** Inter sans for everything.
- **Fix:** Playfair Display serif for headings + DM Sans for body (his
  prototype's fonts).

### 6. Wrong membership price
- **What I did:** Page showed `$4.99/month` plus an invented annual tier.
- **Impact:** Factually wrong — not what he confirmed.
- **Fix:** Corrected to the confirmed **$8/month flat, unlimited watchers**
  ("Everyday Plus"); removed the fabricated annual pricing everywhere.
- **Rule:** Never invent prices/plans. $8/month is the confirmed number.

### 7. The filter page didn't match his reference
- **What I did:** My own filter design; "some yellow thing… looks horrible."
- **Fix:** Rebuilt the search/filter page to match `search-filters.png`
  exactly — bordered gold panel, checkbox category tree, price chips,
  discount, star rating, Reset/Apply, proper empty state.

### 8. Didn't save all his images
- **What I did:** Saved only the images I happened to build from.
- **Fix:** Archived every reference image he gave into
  `assets/design-system/references/` (18 handoff images + 5 direct uploads).
- **Rule:** Save every asset he sends, immediately.

### 9. Reused another project's Google OAuth client
- **What I did:** Used the Quit Critters Google client ID for this site.
- **Fix rule:** Every project gets its OWN new credentials/IDs/accounts.
  (Google sign-in still needs a new Black Daily Deals Cloud project.)

---

## Working rules going forward
1. Use his real images and mockups exactly — never draw or improvise.
2. Champagne gold, Playfair + DM Sans, ambient glow — the Design System.
3. Test the real live URL in his Chrome before saying "done." Primary host is
   now Cloudflare Pages (black-daily-deals.pages.dev); GitHub Pages is backup.
4. Never invent data (prices, deals, ratings) — only verified/real.
5. Improve the existing site; don't rebuild from scratch.
6. Save every asset he provides right away.
7. Each project gets its own credentials.

## Current state (Stage 1 — COMPLETE ✓, signed off 2026-11-18)
All pages reskinned to the design system and verified live in Chrome:
Home, Categories (big-image), Deals/Search (filters), Alerts, Profile,
Membership. Real deals in `data/deals.json`. Direct-bridge data files and
announcement system in `data/`.

Immersive layer added and signed off this session:
- **Showroom backdrop** — Moishy's gold "EBF" showroom image (labeled
  category pedestals) sits behind every page via `css/stage.css`. Replaced
  the earlier (rejected) tunnel image.
- **Walk-into-the-shop depth** — native CSS scroll-driven push-in on the
  room (`@supports (animation-timeline: scroll())`), GPU-smooth, with a
  `prefers-reduced-motion` static fallback. Not scratchy, works on mobile.
- **Statement band** — "You don't need a hundred websites. Just this one —
  watching every deal for you." as crisp HTML text over the room (NOT baked
  into the image, so it stays editable).
- **Free room crops** — per-page category close-ups cropped from the one
  showroom image, saved in `assets/rooms/` (aisle-left, aisle-right,
  corner-electronics, corner-travel). Route for per-page images: crop first,
  generate only new angles (Google AI mode / Picsart).

## Hosting migration — DONE (2026-11-18)
- Moved hosting from GitHub Pages to **Cloudflare Pages** — LIVE and verified
  in Chrome at **black-daily-deals.pages.dev** (home + deals data + footer all
  render). Connected to the GitHub repo (moishyjalas-lang/black-daily-deals),
  auto-deploys on every push to `main`. Unlimited static bandwidth, free.
- Set up as a separate Pages project inside the Benefit Fund Cloudflare account
  (option B). Hosting-account reuse only — all login/API creds stay per-project.
- GitHub Pages left live as a backup for now (decide later whether to turn off).
- Decided: Cloudflare (front) + Supabase (accounts/alerts/deals) stack; Admin
  screen for daily deal/pop-up changes, Claude+preview for code changes; free
  Supabase is a testing tier, not guaranteed production (see BUILD-PLAN).

## Still to do (Stage 2)
- **Per-page rooms rollout** — make every page a different corner of the
  same shop (same lighting/arches/floor) with the same walk-in depth. Crop
  from the showroom where possible; generate the few new angles. Approved
  direction, not yet built across category pages.
- Hero welcome-page video (Moishy is making it) → replaces `hero-ebf.png`.
- Stripe ($8/mo) checkout, server-side subscription enforcement.
- Sender.net email (subscribe + watcher alerts) — token + group ID needed.
- Google OAuth — new Cloud project/client.
- Real product feeds (Amazon/Best Buy/Walmart) for auto-updating deals.

## TODO 2026-11-18 (~2am ET) — Swap OAuth support email before launch
- Google OAuth consent screen "User support email" is TEMPORARILY moishyjalas@gmail.com.
- This is only acceptable while the app stays in TESTING mode (not public — nobody but MJ can reach it).
- MUST change before going public so the personal email is never shown on the consent screen.
- Plan (tomorrow): use the iPhone his mother has to create the real brand email(s) and the email system, then set a brand email / Google Group as the support contact and swap it here.

## SESSION PLAN — set 2026-11-18 ~2:25am ET (MJ restarting computer, coming back for a long session)
Ordered by MJ emphasis:
1. CATEGORIES (MOST IMPORTANT): finish categories page + how deals load per category. Make it work live.
2. Finish the Google sign-in button (OAuth consent screen was half-done, not saved — redo quickly; support email = moishyjalas@gmail.com TEMP in testing mode).
3. Build the Admin Control Center (per docs/CONTROL-CENTER-SPEC.md).
4. Build the system/user profile — CONFIRM exact scope with MJ (ambiguous: "build our profile of our system").
5. Put the site live on the domain (everydayblackfriday.com is TAKEN — need a name pick).
6. Black Friday centerpiece (special attention-grabbing feature).
AMBIGUOUS TO CONFIRM: MJ also said "we got what you said to me for last" — confirm which item.
TOMORROW: swap OAuth support email via mom iPhone to real brand email (see TODO above).

## 2026-11-18 (~3am ET) — Sign-in rebuilt to proper Supabase Auth (STAGED, not deployed)
DONE in code (workspace only, live site untouched):
- Removed foreign Google client ID (875134997725...) from js/shared.js — violated the no-reused-credentials rule.
- Rewrote sign-in to use Supabase Auth (GoTrue) with Google: signIn() redirects to /auth/v1/authorize?provider=google; handleAuthRedirect() captures tokens from the URL hash; loadSbUser() fetches the user + profiles row (is_pro, is_admin); refreshSb() + signOut() added. Lightweight REST, no extra library.
- Unified the EBF object (window.EBF + Object.assign) so shared.js and supabase-client.js share one object. This ALSO fixes the search.html deal-loading bug (EBF.loadDeals was being shadowed).
- Added js/supabase-config.js to categories/alerts/profile/membership so auth works site-wide.
- Fixed announcements.json path (was the old GitHub Pages /black-daily-deals/ prefix).
- node --check passed.
REMAINING to finish + test (ALL need MJ logged into Supabase):
1. Supabase Auth > Providers > Google: enable, paste Client ID + Secret (from the new everyday-black-friday OAuth client; regenerate secret if the one-time dialog was closed).
2. Supabase Auth > URL Configuration: set Site URL + Redirect URLs to the live site + preview URLs (so redirect_to is allowlisted — REQUIRED or login bounces).
3. Deploy updated code to a PREVIEW branch (not main).
4. Live-test: click Sign in -> Google -> back -> signed in; confirm a profiles row is created.
NOTE: Google GIS script tags (accounts.google.com/gsi/client) left in pages but now unused — can be removed in a later cleanup.

## 2026-11-18 (~3:15am ET) — Owner HQ foundation built (hq.html) — STAGED, not deployed
Source design: HQ-Design-Pack (16 screens) staged from MJ computer; read specs + roadmap + saw dashboard PNG.
Built in hq.html (one shared shell, warm black/gold per design, hash-routed, owner-gated):
- Owner GATE: on load, Supabase session -> loadSbUser -> only user.is_admin enters; others see sign-in or owner-only message. (Needs auth live + MJ account flagged is_admin.)
- Top bar + grouped 16-screen sidebar (Overview / Deals & Catalog / Website & Marketing / People / Operations).
- DASHBOARD: metric row (honest em-dash until data connected), clicks!=sales note, quick shortcuts, deal-activity/recent-changes/failed-job panels with honest not-connected states.
- DEAL LIBRARY: reads LIVE Supabase deals via EBF.loadDeals(); search + status tabs + table (image/status/price/discount/retailer/last-checked) + Edit.
- ADD/EDIT DEAL: full form + live public preview; saveDeal() writes to Supabase REST (POST/PATCH deals) using the owner access token (RLS admin-write). UNTESTED until auth live.
- Other 12 screens: honest "In build queue" placeholders listing each screen real features (NOT fake controls).
- node --check on inline JS: passed.
REMAINING before HQ works end-to-end (all need MJ Supabase login):
1. Finish Supabase Google auth (enable provider + creds + URL config).
2. Flag MJ as owner: update public.profiles set is_admin=true where email=(MJ email).
3. Deploy to PREVIEW; MJ signs in; confirm gate opens + deal read/write works.
4. Then build remaining 12 screens one at a time, each checked vs its design.

## 2026-11-18 (fork, while MJ away) — All 12 remaining Owner HQ screens built (hq.html) — STAGED, not deployed
Shared helpers added to hq.html: sbSelect/sbWrite (owner-token REST), logAudit, notSetUp degrade state.
Appended ~13 new tables + RLS to supabase/schema.sql (idempotent, admin-gated; NOT run): category_nodes, import_batches, import_rows, site_settings, site_revisions, promotions, email_campaigns, support_cases, team_invites, audit_events, emergency_flags, search_log, integrations; plus columns profiles.role, newsletter_subscribers.status/consent_source/unsubscribed_at.

Screens wired to EXISTING tables (real reads/writes, UNTESTED until auth live):
- Billing: reads profiles; manual Pro grant/revoke writes profiles + audit (never counted as revenue); Stripe revenue = em dash.
- Subscribers & Demand: reads newsletter_subscribers (search + CSV export), watchers (aggregated popular keywords), unsubscribe writes; search_log degrades.
- Email: reads subscriber count + deals (approved-deal picker + live preview); SENDING DISABLED (needs Sender.net); draft saves to email_campaigns.
- Team: reads profiles; role change writes profiles.role/is_admin; last-owner protection; MFA/sessions noted as Supabase-managed.
- Integrations: live DB + auth status check; Cloudflare = live (page served); Stripe/Sender/Amazon = Not connected; provider links only, no secrets.
- Health: live DB/auth ping; audit log read; honest backup/restore guidance (Supabase free = self-export).

Screens needing NEW tables (degrade to "not set up yet" until MJ runs schema):
- Categories (category_nodes): tree + add/rename/archive.
- Imports (import_batches history; APPROVE writes straight to deals — works now): CSV upload, client-side parse + validate (missing/dup/suspicious-discount), approve clean rows.
- Appearance (site_settings): settings form; public site reads them only after a later wiring step (not live yet).
- Promotions (promotions): editor + visitor preview + list; public site honors them after later wiring.
- Support (support_cases): inbox/report queue + resolve.
- Emergency (emergency_flags): 7 independent reversible pause switches + confirm/reason/audit; public site honors after later wiring.
- AI (control surface only): drafting DISABLED — no scoped connector implemented; honest; action log reads audit_events.

node --check passed after every batch. Existing screens (shell/gate/router/Dashboard/Deal Library/Add-Edit) untouched.
NEEDS MJ: (1) Supabase login to finish Google auth; (2) run updated supabase/schema.sql; (3) set profiles.is_admin=true for his account; (4) deploy to PREVIEW; (5) live-test gate + each screen's reads/writes. Nothing deployed or claimed working.

## 2026-11-18 (~3:10pm ET) — Auth configured + preview deployed
DONE by Claude (owner present, Supabase logged in):
- Supabase Auth > Google: ENABLED with the everyday-black-friday Client ID + secret; callback matched.
- Supabase Auth > URL config: Site URL = https://black-daily-deals.pages.dev; redirect allow-list = https://black-daily-deals.pages.dev/** and https://*.black-daily-deals.pages.dev/**
- Code committed to preview branch owner-hq-auth and pushed (Cloudflare preview building at https://owner-hq-auth.black-daily-deals.pages.dev). LIVE main untouched.
REMAINING (do WITH MJ when back, all quick):
1. Run the updated supabase/schema.sql in the SQL editor (adds HQ tables; additive/idempotent) — HOLD until MJ present.
2. MJ signs in on the preview with Google (creates his profiles row).
3. Run: update public.profiles set is_admin=true where email=(MJ email);
4. MJ opens /hq.html on the preview -> HQ opens. Test each screen. Then merge owner-hq-auth -> main to go live.

## 2026-11-18 — HQ verified working + next-phase direction

### HQ status (DONE, on preview branch owner-hq-auth — NOT merged to live)
- Google sign-in → owner gate (is_admin) → HQ opens. Verified live.
- Session persists across reload (refresh_token auto-refresh works). Earlier logout was just an hours-old session fully expiring.
- Dashboard, Deal Library (real deals), Category Tree all load.
- FULL HQ schema run on the DB (plain-SQL injection via Monaco, not base64). All 13 HQ tables confirmed via information_schema. Owner flag + role='owner' set.
- OAuth app still in "Testing" mode → only moishyjalas@gmail.com can sign in; public sign-in needs publishing later.

### MJ's PUBLIC-SITE visual vision — BUILD THIS LATER (after domain/email/suppliers)
Immersive "walking through a shop" category experience:
- Background images that come CLOSER as you scroll down (depth / dolly-in feel).
- Each category has its OWN picture (use real category images in assets/categories/*.jpg + rooms/*).
- A side visual showing which category/aisle you're currently in.
- Page-to-page transition feels like "turning" a corner in the shop, then walking straight again.
- "The top looks disgusting" — rework the top/header/hero of the public site.
- Make it "stronger." Light coming closer. Use his REAL images, never drawn.

### MJ's stated priority order (his words, 2026-11-18)
1. Hosting + domain + business Gmail (in progress; Gmail waits for mom's iPhone tomorrow for QR)
2. Connect everything together
3. Start emailing suppliers
4. Start advertising
5. THEN build the shop-walkthrough visual experience above
