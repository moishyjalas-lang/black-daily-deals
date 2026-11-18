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
3. Test the real live GitHub Pages URL in his Chrome before saying "done."
4. Never invent data (prices, deals, ratings) — only verified/real.
5. Improve the existing site; don't rebuild from scratch.
6. Save every asset he provides right away.
7. Each project gets its own credentials.

## Current state (Stage 1 — foundation ready)
All pages reskinned to the design system and verified live in Chrome:
Home, Categories (big-image), Deals/Search (filters), Alerts, Profile,
Membership. Real deals in `data/deals.json`. Direct-bridge data files and
announcement system in `data/`.

## Still to connect (Stage 2)
- Hero welcome-page video (Moishy is making it) → replaces `hero-ebf.png`.
- Stripe ($8/mo) checkout, server-side subscription enforcement.
- Sender.net email (subscribe + watcher alerts) — token + group ID needed.
- Google OAuth — new Cloud project/client.
- Real product feeds (Amazon/Best Buy/Walmart) for auto-updating deals.
