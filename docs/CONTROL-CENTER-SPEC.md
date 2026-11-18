# Everyday Black Friday — Admin Control Center (spec)

Written 2026-11-18, grounded in research on how real deals / membership / email
sites are actually controlled and built. This is the blueprint for the one
private cockpit that runs the whole business — operated by Moishy OR by AI he
points at it.

## How it's built (the pattern everyone uses)
A custom admin panel on our own stack (Cloudflare + Supabase): a **left sidebar
+ CRUD modules** (deals, members, etc.) with **search / filter / pagination**,
**role-gated routes** (only admins get in), a **metric-card dashboard**, and
**CSV import/export** — plus an **audit log** that records every change (who did
what, when). This is the standard admin-panel shape and it maps 1:1 onto our
Supabase tables.
- **Access:** admin-only via Row Level Security + the `is_admin` flag we already
  built. The public site keeps the publishable key; the admin's privileged
  actions run through Supabase Auth as an admin user (no secret key in the
  browser).
- **Speed option:** tools like Refine/Supamode can auto-generate CRUD screens
  from our schema in minutes; we can also hand-build to match the brand. Likely
  a hybrid: generate the plumbing, skin it in champagne gold.

## The panels (complete control list)
1. **Dashboard** — metric cards (visitors, signups today, members, revenue,
   top-clicked deals) + a chart + recent-activity feed.
2. **Deals** — full CRUD: add/edit/delete, price, discount, store, category,
   image, affiliate link, affiliate yes/no, expiry, flags (Biggest Black
   Friday · Featured · Deal of Day). Search/filter. **Bulk CSV import.**
3. **Pop-ups / Promos** — message, button+link, audience (all/members/
   non-members), start–end schedule, close button, frequency cap, on/off.
4. **Newsletter & Email Engine** — see its own section below.
5. **Subscribers** — newsletter list: count, growth, search, export.
6. **Members ($8 Pro)** — list, count, MRR; manage via Stripe; **bulk-assign a
   plan to people who paid offline**; refunds/cancels link to Stripe. Members
   self-serve (upgrade/cancel/card) via the **Stripe Customer Portal**.
7. **Alerts / Demand** — every keyword people are watching = what to source next.
8. **Team & Users** — invite more operators, assign **roles** (full admin /
   edit-deals-only / view-only), remove access. Role-based access control.
9. **AI Builder** — the in-app AI agent + the "change the app" preview flow
   (see its own section).
10. **Settings** — hero text, announcement bar, categories, footer — site words,
    editable without code.
11. **Infrastructure** — status + one-click links to Cloudflare / Supabase /
    Stripe / domain. Shown, not rebuilt (master keys never go in the app).

## The Email Engine (Sender.net) — the automatic system
Sender.net (already our email tool, free up to 15,000 emails/mo) does BOTH jobs
from one account, with **unlimited automation, segmentation, premade workflows,
a drag-and-drop builder, and an email API**:
- **The daily newsletter (marketing / bulk)** — in the Control Center you curate
  which deals go in (or auto-pull the biggest), edit subject/text, preview, and
  **schedule a daily auto-send** (a scheduled job assembles the email from the
  deals table and sends via Sender). Draft → Scheduled → Sent, with open/click
  stats back.
- **Watcher alerts (transactional / triggered)** — when a deal matches someone's
  keyword, a one-to-one email fires instantly via Sender's transactional API
  (`POST https://api.sender.net/v2/message/send`, Bearer token). Separate lane
  from the newsletter so alerts are instant and never caught in a bulk queue.
- **Templates** — branded layouts, editable; Sender hosts the sending, we store
  the API token server-side (never in the browser).

## The Alert Engine (how watchers fire) — proven pattern
The classic price/keyword-drop loop: a **scheduled job** checks deals against
every active watcher; for each watcher whose rule matches (keyword hit, and/or
price under their threshold), it fires an alert. Built-in safeguards:
- **Idempotency guard** — mark a watcher "alerted" in one atomic update so a
  retry can't double-send.
- **Per-user rate limit** — at most one alert per watch per hour, so nobody gets
  spammed.
- **Async fan-out** — matching and sending are decoupled so a burst of matches
  doesn't stall anything.
Watchers table already exists (user, keyword, category, max_price, active).

## The AI-Control Layer — "the AI IS the app" (the exciting part)
Research confirms Moishy's vision is a real, emerging standard: **WebMCP**
(a W3C draft browser API, Feb 2026). Instead of an AI "looking at and clicking"
the site, the **app exposes its actions as typed tools** the AI calls in plain
language — the AI uses *the same actions the buttons use*, and the human can
take over at any moment. The pattern people are shipping: a **chat panel that
lives inside the admin and operates the console** ("add this deal", "launch a
weekend pop-up", "draft tonight's newsletter", "which alerts are hottest?").
Two layers:
- **In-app AI assistant (data layer)** — controls everything the admin panels
  do: deals, pop-ups, newsletter, members. Runs through the same admin
  operations (so it can never do more than the admin can). Dynamic tool access
  = a security boundary (a tool is only available where/when it should be).
- **Coding AI (app layer)** — to change how the app looks/works: it builds on a
  **preview branch**, Moishy reviews the preview, approves, it merges; one-click
  rollback always available. With an **audit log + approval step** so nothing
  surprises him.
Boundary (safety): the AI fully runs the app (data + code via preview). It does
NOT hold the master infrastructure keys (Cloudflare/Supabase/Stripe) — that's
the one real lock-out / hack risk, so those stay behind their own logins.

## Analytics (visitors) — free, no cookie banner
**Cloudflare Web Analytics**: free, unlimited pageviews, privacy-first, **needs
no cookie-consent banner**; counts visits, page views, referrers, country,
and speed. Add a one-line beacon snippet; exclude `/admin/*` from tracking.
Honest limit: it's **dashboard-only (no public API)**, so the Control Center
shows the headline numbers + a link to the full Cloudflare analytics, rather
than deeply embedding them. (If we later want live numbers inside the panel, we
log lightweight page-view counts to Supabase too.)

## Build order (recommendation)
1. **Deals panel + the in-app AI assistant** — so Moishy can run the site
   (add/edit deals by clicking OR by telling the AI) immediately.
2. **Google sign-in + make Moishy admin** (needs a new Google Cloud project).
3. **Newsletter engine** (curate + daily auto-send via Sender).
4. **Watcher alerts** (the triggered emails) + Stripe $8 checkout.
5. **Team/users, Settings, Analytics, Infrastructure** panels.
Everything sits on the Supabase tables already built; each panel is additive and
ships behind the preview→approve flow so the live app never breaks.
