# Stage 2 — Where the deals (and the money) come from

Captured 2026-11-18 from Moishy's research (two passes). These are **leads,
not signed partnerships.** Vendor coverage claims are their own — untested.
Assume a U.S. launch, dollar pricing.

## The one honest truth
There is **no single plugin or API that auto-turns every retailer's sale into
a commission link.** Deals come from three places, and we'll use all three:
1. **Aggregator API** — one integration that bundles many retailers.
2. **Affiliate network / retailer feeds** — approved retailer-by-retailer.
3. **Manual / CSV upload** — our own admin screen (the launch fallback, zero
   dependency on anyone approving us).

And no vendor builds **our** part: saving each person's typed watchers,
matching new deals to them, enforcing 1 free / unlimited at $8/mo, and sending
matched emails through Sender. That's custom either way.

## Build approach (confirmed direction)
**Custom site + Supabase** (auth, database, file storage, scheduled cron jobs)
is the right fit — not a generic shop plugin bent into a deal site. Current
site is static (GitHub Pages) = great for the look; the engine (accounts, DB,
Stripe, email automation, price snapshots) needs this backend layer.

## Aggregator / feed candidates (to request U.S. terms from)
- **Skimlinks Product Key API** — U.S. aggregator; product offers, prices,
  discounts, stock, images, affiliate URLs. Free to join, takes a commission
  share; API on request. Could cut many separate integrations.
  https://developers.skimlinks.com/product-key.html
- **Squirrel API** — closest to our deal workflow: search by keyword / URL /
  barcode / SKU, returns offers with tracked links, stock, price. Starter
  ~£29.99/mo + VAT / 10,000 requests; some alert/webhook features need a
  higher plan. https://getsquirrel.co/products/api
- **Datafeedr** — 30+ networks, 22,000+ merchants, from $49/mo (+ API sub).
  Still need per-merchant approval. https://www.datafeedr.com/
- **ShopSavvy** — strong **price history** (back to 2011) but API from
  $490/yr and unclear its links earn commission → treat as price-data only,
  not revenue. https://shopsavvy.com/pricing
- **Rakuten / Awin / CJ / Impact / Amazon Creators API** — network feeds as
  fallback; each needs publisher setup + advertiser-by-advertiser approval.
- **WordPress + Content Egg Pro** ($59/yr) — only if we ever went WordPress;
  its alerts are product-based, not our keyword-watcher model. Not our path.

## Higher-rate merchant leads by category (all "up to" — need approval)
| Category | Lead(s) | Published rate |
|---|---|---|
| Electronics & Tech | B&H | 8% (listed products) · Adorama 8% private brands · Lenovo up to 5% |
| Home & Living | Sijo 10% · Blu Dot up to 10% · Lumens 3–10% · Lowe's "up to 25%" (confirm eligibility) |
| Fashion & Care | BuddyLove 10% · bebe up to 10%+ · ILIA 10% (beauty) |
| Family & Everyday | Smiling Tree Toys 10% · Bloom 10% · Carter's 2%→up to 15% after review |
| Sports & Outdoors | EXPED 10% · Outdoorplay 8%→15% · Patagonia 8% |
| Auto & Tools | A-Premium 10–20% · BuyAutoParts 0.5–8% · Andy's Auto Sport 6% |
| Travel | Tortuga 10% · Travelpro 8% · Viator 8% (activities) |
| Seasonal & Gifts | Smiling Tree Toys 10% · 1-800-Flowers 6% · Etsy (no fixed rate, confirm) |

**First leads to pursue:** Outdoorplay, Patagonia, EXPED, Sijo, ILIA, bebe,
Smiling Tree Toys, Travelpro. Amazon is broad but lower (~2–4.5%).

## Rules / cautions
- Every "up to" rate needs written approval that a **deal/price-comparison
  site qualifies**, that **sale items earn commission**, and that a usable
  **product feed** exists. Returns/cancellations cut commission.
- FTC: show a clear affiliate disclosure close to each deal link.
- Every deal must show real retailer, current price, expiry/last-checked, and
  disclosure. "View Deal" goes straight to the retailer via the tagged link.
- Save dated price snapshots from day one, or we can't honestly show price
  history later.
- **Never scrape retailer pages. Never invent prices or links.**

## Recommended sequence
1. Build the engine on Supabase; ship **manual/CSV upload** first (launch with
   real deals, no waiting on approvals).
2. Apply to **Skimlinks + Squirrel**; confirm their actual U.S. retailer lists
   cover the stores we want. Wire in whichever fits.
3. Add high-rate networks/retailers one by one as approved.
4. Layer n8n later only if it removes repetitive feed work (check its license
   first — Sustainable Use License, not standard open source).

## What needs Moishy (not me)
Affiliate applications, account sign-ups, and any payment/eligibility terms are
yours to approve/submit. I can draft the applications and build all the site
logic; I don't create accounts or accept terms on your behalf.
